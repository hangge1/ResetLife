export type CreateAccessPasswordState = {
  fieldErrors: {
    username?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  };
};

export type VerifyAccessPasswordState = {
  fieldErrors: {
    username?: string;
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
