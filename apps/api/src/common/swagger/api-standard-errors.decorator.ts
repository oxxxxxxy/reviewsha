import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

export function ApiStandardErrors(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Bad request.' }),
    ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'Authentication required.' }),
    ApiForbiddenResponse({ type: ApiErrorResponseDto, description: 'Access is forbidden.' }),
    ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'Resource was not found.' }),
    ApiUnprocessableEntityResponse({
      type: ApiErrorResponseDto,
      description: 'Payload is semantically invalid.',
    }),
    ApiInternalServerErrorResponse({
      type: ApiErrorResponseDto,
      description: 'Unexpected server error.',
    }),
  );
}
