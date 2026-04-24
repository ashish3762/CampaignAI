// Typed error classes so the error middleware can branch on instanceof
// instead of parsing message strings.

export class AppError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  /** @param {string} message @param {import('zod').ZodIssue[]} [issues] */
  constructor(message, issues) {
    super(400, message);
    this.issues = issues ?? [];
  }
}

export class NotFoundError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(404, message);
  }
}
