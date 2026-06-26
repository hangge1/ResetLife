export type CreateAccessPasswordState = {
  fieldErrors: {
    password?: string;
    confirmPassword?: string;
    form?: string;
  };
};

export type VerifyAccessPasswordState = {
  fieldErrors: {
    password?: string;
    form?: string;
  };
};

export const initialCreateAccessPasswordState: CreateAccessPasswordState = {
  fieldErrors: {},
};

export const initialVerifyAccessPasswordState: VerifyAccessPasswordState = {
  fieldErrors: {},
};
