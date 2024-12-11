import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ParseJsonPipe
  implements PipeTransform<string, Record<string, any>>
{
  transform(value: string, metadata: ArgumentMetadata): Record<string, any> {
    const propertyName = metadata.data;
    if (typeof value !== 'string') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      console.log(e);
      throw new BadRequestException(
        `${propertyName ?? 'input'} contains invalid JSON `,
      );
    }
  }
}
