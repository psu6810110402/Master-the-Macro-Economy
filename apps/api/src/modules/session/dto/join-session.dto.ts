import { IsString, IsNotEmpty, Length } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}
