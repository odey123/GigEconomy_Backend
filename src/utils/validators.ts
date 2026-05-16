import Joi from 'joi';
import { ValidationError } from './errors';

/**
 * Validation schemas for request validation
 */

export const userValidationSchemas = {
  register: Joi.object({
    firstName: Joi.string().required().min(2).max(50),
    lastName: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    password: Joi.string().required().min(6).max(100),
    role: Joi.string().valid('worker', 'client').required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    bio: Joi.string().max(500),
    profileImage: Joi.string().uri(),
    skills: Joi.array().items(Joi.string()),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      postalCode: Joi.string(),
      country: Joi.string(),
    }),
  }),
};

export const jobValidationSchemas = {
  create: Joi.object({
    title: Joi.string().required().min(5).max(100),
    description: Joi.string().required().min(20).max(2000),
    category: Joi.string().required(),
    budget: Joi.number().required().positive(),
    dueDate: Joi.date().required().greater('now'),
    location: Joi.object({
      address: Joi.string(),
      city: Joi.string(),
      latitude: Joi.number(),
      longitude: Joi.number(),
    }),
    estimatedDuration: Joi.string(),
    skills: Joi.array().items(Joi.string()),
    attachments: Joi.array().items(Joi.string().uri()),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(100),
    description: Joi.string().min(20).max(2000),
    budget: Joi.number().positive(),
    dueDate: Joi.date(),
    location: Joi.object({
      address: Joi.string(),
      city: Joi.string(),
      latitude: Joi.number(),
      longitude: Joi.number(),
    }),
    estimatedDuration: Joi.string(),
    skills: Joi.array().items(Joi.string()),
    attachments: Joi.array().items(Joi.string().uri()),
  }),
};

export const bookingValidationSchemas = {
  create: Joi.object({
    jobId: Joi.string().required(),
    proposedBudget: Joi.number().required().positive(),
    deliverables: Joi.string(),
    attachments: Joi.array().items(Joi.string().uri()),
  }),
};

export const reviewValidationSchemas = {
  create: Joi.object({
    bookingId: Joi.string().required(),
    rating: Joi.number().required().integer().min(1).max(5),
    comment: Joi.string().required().min(10).max(1000),
    categories: Joi.object({
      communication: Joi.number().integer().min(1).max(5),
      professionalism: Joi.number().integer().min(1).max(5),
      quality: Joi.number().integer().min(1).max(5),
      timeliness: Joi.number().integer().min(1).max(5),
    }),
  }),
};

export const paymentValidationSchemas = {
  create: Joi.object({
    bookingId: Joi.string().required(),
    paymentMethod: Joi.string().valid('card', 'transfer', 'wallet').required(),
    description: Joi.string(),
  }),
};

export const walletValidationSchemas = {
  create: Joi.object({
    bvn: Joi.string().required().length(11),
    firstName: Joi.string().required().min(2).max(50),
    lastName: Joi.string().required().min(2).max(50),
    middleName: Joi.string().allow('').optional(),
    dateOfBirth: Joi.string().required(), // mm/dd/yyyy
    gender: Joi.string().valid('1', '2').required(), // '1' = Male, '2' = Female
    address: Joi.string().required().min(5),
    beneficiaryAccount: Joi.string().length(10).optional(),
  }),

  withdraw: Joi.object({
    amount: Joi.number().required().positive(),
    bankAccount: Joi.object({
      accountNumber: Joi.string().required().length(10),
      bankCode: Joi.string().required(),
    }).required(),
  }),
};

/**
 * Validate data against a schema
 */
export const validate = (data: any, schema: Joi.Schema): any => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    throw new ValidationError(messages);
  }

  return value;
};
