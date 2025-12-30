import * as yup from 'yup';

export const profileUpdateSchema = yup.object({
  fullName: yup
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .optional(),
  phone: yup
    .string()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Please enter a valid phone number')
    .optional(),
  address: yup
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  image: yup.string().url('Please enter a valid image URL').optional(),
});

export type ProfileUpdateFormData = yup.InferType<typeof profileUpdateSchema>;

