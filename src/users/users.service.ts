import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Company } from 'src/company/company.model';
import { Resume } from 'src/resume/resume.model';
import { RolesService } from 'src/roles/roles.service';
import { WorkExperience } from 'src/workExperience/workExperience.model';
import { AddInfoToUserDto } from './dto/add-info-to-user.dto';
import { AddRoleDto } from './dto/add-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CandidateStatus, User } from './users.model';
import {
  PaginatedResponse,
  UserReactionWithDocument,
  UserReactionsCounts,
  ValidationResponse,
} from 'src/utils/interfaces';
import {
  getInfoPagination,
  maskContacts,
  maskPersonalData,
  maskSensitivePersonalData,
  paginate,
} from 'src/utils/utils';
import { Op, QueryTypes } from 'sequelize';
import { Contact } from 'src/contacts/contacts.model';
import { Role, Roles } from 'src/roles/roles.model';
import moment from 'moment';
import { FinanceAccount } from 'src/financeAccounts/financeAccounts.model';
import { LoggerService } from 'src/logger/logger.service';
import { FilesService } from 'src/files/files.service';
import {
  CompanyEmployeesFiltersQueryDto,
  CompanyEmployeesSortingDTO,
} from 'src/users/dto/company-employees-filters-query.dto';
import { mapQueryToOrderCondition } from 'src/utils/queryToDbRequest';
import { CompanySubscriptions } from 'src/company/company-subscription.model';
import { Vacancy } from 'src/vacancy/vacancy.model';
import { Hire, HireStatus } from 'src/vacancy/hire.model';
import { CalendarEvent } from 'src/calendar/calendarEvents.model';
import {
  CompanyUsersStatisticsFiltersQueryDto,
  CompanyUsersStatisticsSortingDTO,
} from './dto/company-users-statistics-filters-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userRepository: typeof User,
    private readonly roleService: RolesService,
    // @Inject(forwardRef(() => ContactsService))
    // private readonly contactsService: ContactsService,
    private readonly fileService: FilesService,
    private readonly sequelize: Sequelize,
    private readonly logger: LoggerService,
  ) {}

  public async create(
    dto: CreateUserDto,
    additional?: Partial<User>,
  ): Promise<User> {
    const role = await this.roleService.getByValue(dto.role);
    if (!role) throw new HttpException(`Role not found`, HttpStatus.NOT_FOUND);

    let candidateStatus: CandidateStatus;
    if (role.value === Roles.candidate)
      candidateStatus =
        additional?.candidateStatus ??
        CandidateStatus.ACTIVELY_CONSIDERING_OFFERS;

    try {
      const result = await this.sequelize.transaction(async (t) => {
        let user = await this.userRepository.create(
          {
            email: dto.email,
            password: dto.password,
            roleId: role.id,
            candidateStatus,
            ...additional,
          },
          { transaction: t },
        );

        user = user.dataValues;
        user = maskSensitivePersonalData(user);
        user.role = role;
        return user;
      });
      return result;
    } catch (e) {
      this.logger.error(
        UsersService.name,
        `Transaction has been rolled back: ${e}`,
        { stack: e.stack },
      );
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async updatePassword(userId: number, password: string): Promise<User> {
    const result = await this.userRepository.update(
      { password },
      { where: { id: userId }, returning: true },
    );

    let user = result[1][0];
    user = maskSensitivePersonalData(user);

    return user;
  }

  public async updateEmail(userId: number, email: string): Promise<User> {
    const result = await this.userRepository.update(
      {
        email,
        emailValidated: false,
        emailValidationCode: null,
        emailValidationCodeSentAt: null,
      },
      { where: { id: userId }, returning: true },
    );

    let user = result[1][0];
    user = maskSensitivePersonalData(user);

    return user;
  }

  public async updateEmailValidationInfo(
    userId: number,
    emailValidated: boolean,
    emailValidationCode?: string,
  ): Promise<User> {
    let emailValidationCodeSentAt: Date;
    if (emailValidationCode) emailValidationCodeSentAt = new Date();

    const result = await this.userRepository.update(
      { emailValidated, emailValidationCode, emailValidationCodeSentAt },
      { where: { id: userId }, returning: true },
    );

    return result[1][0];
  }

  public async checkEmailValidationCode(
    userId: number,
    emailValidationCode?: string,
  ): Promise<ValidationResponse> {
    const user = await this.getById(userId);
    if (user.emailValidationCode !== emailValidationCode) {
      throw new ConflictException('Wrong verification code');
    }
    if (
      moment(new Date()).diff(user.emailValidationCodeSentAt, 'minute') >= 10
    ) {
      throw new GoneException('Verification code expired');
    }

    await this.userRepository.update(
      { emailValidated: true },
      { where: { id: userId } },
    );

    return { success: true };
  }

  public async addMainInfo(
    userId: number,
    dto: AddInfoToUserDto,
  ): Promise<User> {
    try {
      const result = await this.sequelize.transaction(async (t) => {
        const transactionHost = { transaction: t };
        const user = { ...dto, contact: undefined };

        if (!dto.languageId)
          user.languageId = (process.env.DEFAULT_LANGUAGE_ID as any) || null;

        const result = await this.userRepository.update(user, {
          where: { id: userId },
          returning: true,
          ...transactionHost,
        });
        const updatedUser = result[1][0];

        return updatedUser;
      });
      return result;
    } catch (e) {
      this.logger.error(
        UsersService.name,
        `Transaction has been rolled back: ${e}`,
        { stack: e.stack },
      );
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // for internal use, don't mask it!
  public async getById(id: number): Promise<User> {
    return this.userRepository.findByPk(id, {
      include: [{ model: Role }],
    });
  }

  public async getFinanceAccountId(userId: number): Promise<number> {
    const user = await this.getById(userId);
    if (user.ownedCompanies?.length > 1 || user.memberedCompanies?.length > 1) {
      throw new HttpException(
        `Too many finance accounts`,
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    const financeAccountId =
      user.ownedCompanies[0]?.financeAccountId ??
      user.memberedCompanies[0]?.financeAccountId;

    return financeAccountId;
  }

  public async getByIdPublic(id: number): Promise<User> {
    return this.userRepository.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Resume, as: 'resume', attributes: ['title'] }],
    });
  }

  public async getAll(): Promise<User[]> {
    const users = await this.userRepository.findAll({
      include: [{ model: Role }],
    });
    return users.map((user) => maskPersonalData(user));
  }

  public async getBanned(): Promise<User[]> {
    const users = await this.userRepository.findAll({
      where: { isBanned: true },
    });

    return users.map((user) => maskSensitivePersonalData(user));
  }

  public async getByEmailAndRoleWithPassword(
    email: string,
    role?: string,
  ): Promise<User> {
    const users = await this.userRepository.findAll({
      where: { email },
      include: [{ model: Role }],
    });

    if (users && users.length > 1) {
      if (role) {
        const user = users.find((user) => user.role.value === role);
        if (!user) {
          throw new UnauthorizedException({
            message: `User with email ${email} and role ${role} not found`,
          });
        }
        return user;
      } else {
        throw new UnauthorizedException({
          message: `User with email ${email} has multiple roles, provide exact one`,
        });
      }
    }

    return users[0];
  }

  // for internal use, don't mask data!
  public async getAllByEmail(email: string): Promise<User[]> {
    return this.userRepository.findAll({
      where: { email },
    });
  }

  public async getMe(userId: number): Promise<User> {
    const user = await this.userRepository.findByPk(userId, {
      include: [
        {
          model: Role,
        },
        {
          model: Contact,
        },
        {
          model: Company,
          as: 'ownedCompanies',
        },
        {
          model: Company,
          as: 'memberedCompanies',
        },
      ],
    });
    return maskSensitivePersonalData(user);
  }

  public async getPaginatedUsersReactionsWithData(
    userId: number,
    model: 'vacancies' | 'resume',
    submodel:
      | 'vacancy_likes'
      | 'vacancy_views'
      | 'vacancy_comments'
      | 'resume_likes'
      | 'resume_views'
      | 'resume_comments',
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<UserReactionWithDocument>> {
    if (
      (model === 'vacancies' &&
        (submodel === 'resume_likes' ||
          submodel === 'resume_views' ||
          submodel === 'resume_comments')) ||
      (model === 'resume' &&
        (submodel === 'vacancy_likes' ||
          submodel === 'vacancy_views' ||
          submodel === 'vacancy_comments'))
    ) {
      throw new HttpException(
        `Wrong data model provided: model = ${model}, submodel = ${submodel}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const pagination = paginate(page, pageSize);
    const documentIdName = model === 'vacancies' ? 'vacancyId' : 'resumeId';
    const mainQueryConditions = `
      FROM Users as u
      INNER JOIN "${submodel}" as reactions ON reactions."userId" = u.id
      INNER JOIN ${model} as d on d.id = reactions."${documentIdName}" 
      where d.id in 
      (SELECT reactions."${documentIdName}" FROM ${model} as dd
      INNER JOIN Users as uu ON dd."userId" = uu.id
      WHERE uu.id = ${userId})
      AND u.id != ${userId}
    `;

    const result: UserReactionWithDocument[] =
      await this.userRepository.sequelize.query(
        `
        SELECT u.id as "user.id", u.email as "user.email", 
        u."firstName" as "user.firstName", u."lastName" as "user.lastName", 
        u."roleId" as "user.roleId",
        d.id as "document.id", d.title as "document.title", 
        reactions."updatedAt" as "updatedAt"
        ` +
          mainQueryConditions +
          `
        ORDER BY reactions."updatedAt" DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset};
    `,
        {
          nest: true,
          plain: false,
          type: QueryTypes.SELECT,
        },
      );

    const [data]: { count: string }[] =
      await this.userRepository.sequelize.query(
        `SELECT count(u.id)` + mainQueryConditions,
        {
          type: QueryTypes.SELECT,
        },
      );

    return {
      results: result.map((userWithDoc) => {
        userWithDoc.user = maskSensitivePersonalData(userWithDoc.user);
        if (model === 'resume')
          userWithDoc.document = maskContacts(userWithDoc.document); // todo: check if we need to mask this
        return userWithDoc;
      }),
      ...getInfoPagination(page, pageSize, data?.count),
    };
  }

  public async getUsersReactionsCounts(
    userId: number,
    model: 'vacancies' | 'resume',
  ): Promise<UserReactionsCounts> {
    const documentIdName = model === 'vacancies' ? 'vacancyId' : 'resumeId';
    const submodel = model === 'vacancies' ? 'vacancy' : 'resume';

    const likesQueryConditions = `
      FROM Users as u
      INNER JOIN "${submodel}_likes" as reactions ON reactions."userId" = u.id
      INNER JOIN ${model} as d on d.id = reactions."${documentIdName}" 
      where d.id in 
      (SELECT reactions."${documentIdName}" FROM ${model} as dd
      INNER JOIN Users as uu ON dd."userId" = uu.id
      WHERE uu.id = ${userId})
      AND u.id != ${userId}
      AND reactions."isViewed" = 'false'
    `;

    const [likes]: { count: string }[] =
      await this.userRepository.sequelize.query(
        `SELECT count(u.id)` + likesQueryConditions,
        {
          type: QueryTypes.SELECT,
        },
      );

    // const respondsQueryConditions = `
    //   FROM Users as u
    //   INNER JOIN "${submodel}_responds" as reactions ON reactions."userId" = u.id
    //   INNER JOIN ${model} as d on d.id = reactions."${documentIdName}"
    //   where d.id in
    //   (SELECT reactions."${documentIdName}" FROM ${model} as dd
    //   INNER JOIN Users as uu ON dd."userId" = uu.id
    //   WHERE uu.id = ${userId})
    //   AND u.id != ${userId}
    //   AND reactions."isViewed" = 'false'
    // `;

    // const [responds]: { count: string }[] =
    //   await this.userRepository.sequelize.query(
    //     `SELECT count(u.id)` + respondsQueryConditions,
    //     {
    //       type: QueryTypes.SELECT,
    //     },
    //   );

    // const viewsQueryConditions = `
    //   FROM Users as u
    //   INNER JOIN "${model}_views" as reactions ON reactions."userId" = u.id
    //   INNER JOIN ${model} as d on d.id = reactions."${documentIdName}"
    //   where d.id in
    //   (SELECT reactions."${documentIdName}" FROM ${model} as dd
    //   INNER JOIN Users as uu ON dd."userId" = uu.id
    //   WHERE uu.id = ${userId})
    //   AND u.id != ${userId}
    //   AND reactions."isViewed" = 'false'
    // `;

    return {
      likes: parseInt(likes?.count),
      // responds: parseInt(responds?.count),
    };
  }

  public async addRole(dto: AddRoleDto): Promise<AddRoleDto> {
    // const userRoles = await this.userRoleRepository.findAndCountAll({
    //   where: { roleId: dto.value, userId: dto.userId },
    // });
    const user = await this.userRepository.findByPk(dto.userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const role = await this.roleService.getByValue(dto.value);
    if (!role) throw new HttpException('Role not found', HttpStatus.NOT_FOUND);

    await user.$add('role', role.id); // TODO: check if it add if already relation exists
    return dto;
  }

  public async updateStatus(userId: number, status: string) {
    const result = await this.userRepository.update(
      { status },
      { where: { id: userId }, returning: true },
    );
    let user = result[1][0];
    user = maskSensitivePersonalData(user);
    return user;
  }

  public async updateCandidateStatus(
    userId: number,
    candidateStatus: CandidateStatus,
  ) {
    const result = await this.userRepository.update(
      { candidateStatus },
      { where: { id: userId }, returning: true },
    );
    let user = result[1][0];
    user = maskSensitivePersonalData(user);
    return user;
  }

  public async changeIsBanned(
    userId: number,
    isBanned: boolean,
    banReason?: string,
  ): Promise<User> {
    let banDate: Date;
    if (isBanned) {
      banDate = new Date();
    }
    const result = await this.userRepository.update(
      { isBanned, banReason, banDate },
      { where: { id: userId }, returning: true },
    );

    let user = result[1][0];
    user = maskSensitivePersonalData(user);
    return user;
  }

  public async upsertImage(
    id: number,
    image: Express.Multer.File,
  ): Promise<User> {
    const user = await this.userRepository.findByPk(id);
    const oldImageName = user.imageName;
    const imageName = await this.fileService.upsert(
      image,
      'images/user',
      id + '_',
      oldImageName,
    );

    const result = await this.userRepository.update(
      { imageName },
      { where: { id }, returning: true },
    );

    return result[1][0];
  }

  public async deleteImage(id: number, imageName?: string): Promise<User> {
    const user = await this.userRepository.findByPk(id);

    if (imageName) {
      await this.fileService.delete(imageName, 'images/user');
    } else {
      await this.fileService.delete(user.imageName, 'images/user');
    }

    // don't touch new images
    if (user.imageName === imageName || !imageName) {
      const result = await this.userRepository.update(
        { imageName: null },
        { where: { id }, returning: true },
      );
      return result[1][0];
    }
    return user;
  }

  public async getCompanyEmployeesPaginated(
    query: CompanyEmployeesFiltersQueryDto,
    sorting: CompanyEmployeesSortingDTO = {},
    userId?: number,
  ): Promise<PaginatedResponse<User>> {
    const pageSize = query.pageSize ? query.pageSize : 10;
    const orderCondition = mapQueryToOrderCondition(sorting.sort);
    const whereCondition = {};
    if (userId) {
      whereCondition['id'] = { [Op.ne]: userId };
    }

    const { rows: employees, count } =
      await this.userRepository.findAndCountAll({
        where: whereCondition,
        ...paginate(query.page, pageSize),
        include: [
          {
            model: Resume,
            as: 'resume',
            required: true, // inner join instead of left outer join
            duplicating: false, // to avoid error
            include: [
              {
                model: WorkExperience,
                required: true,
                duplicating: false,
                include: [
                  {
                    model: Company,
                    where: { id: query.companyId },
                    required: true,
                    duplicating: false,
                  },
                ],
              },
            ],
          },
        ],
        order: orderCondition,
      });

    return {
      results: employees.map((user) => maskPersonalData(user)),
      ...getInfoPagination(query.page, pageSize, count),
    };
  }

  public async updateUserActivity(userId: number) {
    const result = await this.userRepository.update(
      { lastActiveTimestamp: new Date() },
      { where: { id: userId }, returning: true },
    );
    return result[1][0];
  }

  public async getCompanySubscriptions(
    userId: number,
  ): Promise<CompanySubscriptions[]> {
    if (!userId) return [];
    const user = await this.userRepository.findByPk(userId, {
      include: [
        {
          model: Company,
          as: 'companySubscriptions',
          attributes: [
            'id',
            'name',
            'website',
            'isVerified',
            'description',
            'imageName',
            [
              Sequelize.literal(
                `(
                  SELECT COUNT(*) FROM company_subscriptions cs
                  WHERE cs."companyId" = "companySubscriptions->CompanySubscriptions"."companyId"
                )`,
              ),
              'subscriptionsCount',
            ],
          ],
        },
      ],
    });
    return user?.companySubscriptions;
  }

  public async changeIsVisible(
    id: number,
    isVisible: boolean,
  ): Promise<boolean> {
    await this.userRepository.update(
      {
        isVisible,
      },
      {
        where: { id },
        returning: true,
      },
    );

    return isVisible;
  }

  public async getCompanyUsers(companyId: number): Promise<User[]> {
    return await this.userRepository.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'imageName',
        [
          Sequelize.literal(`
            CASE
              WHEN "ownedCompanies->CompanyOwners"."companyId" IS NOT NULL THEN 'owner'
              WHEN "memberedCompanies->CompanyMembers"."companyId" IS NOT NULL THEN 'member'
              ELSE NULL
            END
          `),
          'companyRole',
        ],
      ],
      include: [
        {
          model: Company,
          as: 'ownedCompanies',
          attributes: [],
          required: false,
          where: { id: companyId },
        },
        {
          model: Company,
          as: 'memberedCompanies',
          attributes: [],
          required: false,
          where: { id: companyId },
        },
      ],
      where: {
        [Op.or]: [
          Sequelize.literal(
            `"ownedCompanies->CompanyOwners"."companyId" IS NOT NULL`,
          ),
          Sequelize.literal(
            `"memberedCompanies->CompanyMembers"."companyId" IS NOT NULL`,
          ),
        ],
      },
    });
  }

  public async getCompanyUsersStatistics(
    query: CompanyUsersStatisticsFiltersQueryDto,
    sorting: CompanyUsersStatisticsSortingDTO = {},
  ): Promise<
    PaginatedResponse<{
      id: number;
      companyRole: 'owner' | 'member';
      firstName: string;
      lastName?: string;
      email?: string;
      imageName?: string;
      vacanciesCount: string;
      hiresTotalCount: string;
      hiresAtWorkCount: string;
      hiresInterviewCount: string;
      hiresOfferCount: string;
      hiresCount: string;
      hiresRefusalCount: string;
      interviewsCount: string;
    }>
  > {
    const pageSize = query.pageSize ? query.pageSize : 10;
    const orderCondition = mapQueryToOrderCondition(sorting.sort);

    const startDate = moment(query.startDate || new Date('1970-01-01')).format(
      'YYYY-MM-DDTHH:mm:ssZ',
    );
    const endDate = moment(query.endDate || new Date()).format(
      'YYYY-MM-DDTHH:mm:ssZ',
    );

    const queryObject = {
      ...paginate(query.page, pageSize),
      order: orderCondition,
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'imageName',
        [
          Sequelize.literal(`
          CASE
            WHEN "ownedCompanies->CompanyOwners"."companyId" IS NOT NULL THEN 'owner'
            WHEN "memberedCompanies->CompanyMembers"."companyId" IS NOT NULL THEN 'member'
            ELSE NULL
          END
        `),
          'companyRole',
        ],
        [
          // Subquery for vacancies count
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "vacancies"."id")
           FROM "vacancies" 
           WHERE "vacancies"."userId" = "User"."id" 
           AND "vacancies"."createdAt" BETWEEN '${startDate}' AND '${endDate}')
        `),
          'vacanciesCount',
        ],
        [
          // Subquery for responds count (hires count)
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "hires"."id")
           FROM "vacancies" 
           LEFT JOIN "hires" ON "vacancies"."id" = "hires"."vacancyId"
           WHERE "vacancies"."userId" = "User"."id" 
           AND "hires"."createdAt" BETWEEN '${startDate}' AND '${endDate}')
        `),
          'hiresTotalCount',
        ],
        [
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "hires"."id")
           FROM "vacancies"
           LEFT JOIN "hires" ON "vacancies"."id" = "hires"."vacancyId"
           WHERE "vacancies"."userId" = "User"."id"
           AND "vacancies"."createdAt" BETWEEN '${startDate}' AND '${endDate}'
           AND "hires"."status" = '${HireStatus.AT_WORK}')
        `),
          'hiresAtWorkCount',
        ],
        [
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "hires"."id")
           FROM "vacancies"
           LEFT JOIN "hires" ON "vacancies"."id" = "hires"."vacancyId"
           WHERE "vacancies"."userId" = "User"."id"
           AND "vacancies"."createdAt" BETWEEN '${startDate}' AND '${endDate}'
           AND "hires"."status" = '${HireStatus.INTERVIEW}')
        `),
          'hiresInterviewCount',
        ],
        [
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "hires"."id")
           FROM "vacancies"
           LEFT JOIN "hires" ON "vacancies"."id" = "hires"."vacancyId"
           WHERE "vacancies"."userId" = "User"."id"
           AND "vacancies"."createdAt" BETWEEN '${startDate}' AND '${endDate}'
           AND "hires"."status" = '${HireStatus.OFFER}')
        `),
          'hiresOfferCount',
        ],
        [
          // Subquery for hires count (hires status = 'HIRED')
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "hires"."id")
           FROM "vacancies"
           LEFT JOIN "hires" ON "vacancies"."id" = "hires"."vacancyId"
           WHERE "vacancies"."userId" = "User"."id"
           AND "vacancies"."createdAt" BETWEEN '${startDate}' AND '${endDate}'
           AND "hires"."status" = '${HireStatus.HIRED}')
        `),
          'hiresCount',
        ],
        [
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "hires"."id")
           FROM "vacancies"
           LEFT JOIN "hires" ON "vacancies"."id" = "hires"."vacancyId"
           WHERE "vacancies"."userId" = "User"."id"
           AND "vacancies"."createdAt" BETWEEN '${startDate}' AND '${endDate}'
           AND "hires"."status" = '${HireStatus.REFUSAL}')
        `),
          'hiresRefusalCount',
        ],
        [
          // Subquery for interviews count (calendar events count)
          Sequelize.literal(`
          (SELECT COUNT(DISTINCT "calendarEvents"."id")
           FROM "calendarEvents"
           LEFT JOIN "calendarEvent_users" ON "calendarEvent_users"."calendarEventId" = "calendarEvents"."id"
           WHERE "calendarEvent_users"."userId" = "User"."id"
           AND "calendarEvents"."createdAt" BETWEEN '${startDate}' AND '${endDate}')
        `),
          'interviewsCount',
        ],
      ],
      include: [
        {
          model: Company,
          as: 'ownedCompanies',
          attributes: [],
          required: false,
          where: { id: query.companyId },
        },
        {
          model: Company,
          as: 'memberedCompanies',
          attributes: [],
          required: false,
          where: { id: query.companyId },
        },
        {
          model: Vacancy,
          as: 'vacancies',
          attributes: [],
          required: false,
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate],
            },
          },
          include: [
            {
              model: Hire,
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: CalendarEvent,
          attributes: [],
          required: false,
          through: {
            attributes: [],
          },
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate],
            },
          },
        },
      ],
      where: {
        [Op.or]: [
          Sequelize.literal(
            `"ownedCompanies->CompanyOwners"."companyId" IS NOT NULL`,
          ),
          Sequelize.literal(
            `"memberedCompanies->CompanyMembers"."companyId" IS NOT NULL`,
          ),
        ],
      },
      group: [
        'User.id',
        'vacancies.id',
        'vacancies->hires.id',
        'calendarEvents.id',
        'ownedCompanies->CompanyOwners.id',
        'memberedCompanies->CompanyMembers.id',
      ],
      subQuery: false,
    } as any;

    const queryCountObject = {
      include: [
        {
          model: Company,
          as: 'ownedCompanies',
          attributes: [],
          required: false,
          where: { id: query.companyId },
        },
        {
          model: Company,
          as: 'memberedCompanies',
          attributes: [],
          required: false,
          where: { id: query.companyId },
        },
        {
          model: Vacancy,
          as: 'vacancies',
          attributes: [],
          required: false,
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate],
            },
          },
          include: [
            {
              model: Hire,
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: CalendarEvent,
          attributes: [],
          required: false,
          through: {
            attributes: [],
          },
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate],
            },
          },
        },
      ],
      where: {
        [Op.or]: [
          Sequelize.literal(
            `"ownedCompanies->CompanyOwners"."companyId" IS NOT NULL`,
          ),
          Sequelize.literal(
            `"memberedCompanies->CompanyMembers"."companyId" IS NOT NULL`,
          ),
        ],
      },
      distinct: true,
    } as any;

    const [paginatedData, count] = await Promise.all([
      this.userRepository.findAll(queryObject),
      this.userRepository.count(queryCountObject),
    ]);

    // const { count, rows: paginatedData } =
    //   await this.userRepository.findAndCountAll(queryObject); // bug: doesn't work

    return {
      results: paginatedData as any,
      ...getInfoPagination(query.page, pageSize, count as any),
    };
  }
}
