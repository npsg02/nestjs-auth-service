import { UserOrderByInput } from '../inputs/UserOrderByInput';
import { UserWhereInput } from '../inputs/UserWhereInput';
import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

@ArgsType()
class UserFindManyArgs {
  @ApiProperty({
    required: false,
    type: () => UserWhereInput,
  })
  @Field(() => UserWhereInput, { nullable: true })
  @Type(() => UserWhereInput)
  where?: UserWhereInput;

  @ApiProperty({
    required: false,
    type: [UserOrderByInput],
  })
  @Field(() => [UserOrderByInput], { nullable: true })
  @Type(() => UserOrderByInput)
  orderBy?: Array<UserOrderByInput>;

  @ApiProperty({
    required: false,
    type: Number,
  })
  @Field(() => Number, { nullable: true })
  @Type(() => Number)
  skip?: number;

  @ApiProperty({
    required: false,
    type: Number,
  })
  @Field(() => Number, { nullable: true })
  @Type(() => Number)
  take?: number;
}

export { UserFindManyArgs };
