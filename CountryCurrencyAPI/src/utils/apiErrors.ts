// Base class for all custom API errors
export class ApiError extends Error {
    public statusCode: number;
    public details: any;

    constructor(statusCode: number, message: string, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    toJson() {
        const json: { error: string, details?: any } = { error: this.message };
        if (this.details) {
            json.details = this.details;
        }
        return json;
    }
}

// 404 Not Found
export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found') {
        super(404, message);
    }
}

// 400 Bad Request (used for validation failures)
export class BadRequestError extends ApiError {
    constructor(message: string = 'Validation failed', details?: any) {
        super(400, message, details);
    }
}

// 503 Service Unavailable (used for external API failure)
export class ServiceUnavailableError extends ApiError {
    constructor(apiName: string) {
        super(503, 'External data source unavailable', `Could not fetch data from ${apiName}`);
    }
}

// 500 Internal Server Error
export class InternalServerError extends ApiError {
    constructor(message: string = 'Internal server error', details?: any) {
        super(500, message, details);
    }
}
