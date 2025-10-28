import { Request, Response, NextFunction } from 'express';
import { ApiError, InternalServerError } from '../utils/apiErrors';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Determine the error type
    let error: ApiError;

    if (err instanceof ApiError) {
        error = err;
    } else {
        // Log unexpected errors for debugging
        console.error('UNEXPECTED SERVER ERROR:', err);
        // Default to 500 Internal Server Error for unhandled exceptions
        error = new InternalServerError('Internal server error');
    }

    // Send the consistent JSON response
    return res.status(error.statusCode).json(error.toJson());
};
