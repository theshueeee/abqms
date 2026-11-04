export type PasswordResetDelivery = (input: {
  email: string;
  token: string;
}) => Promise<void>;
//Defines a function type
//Any function matching it must receive an object containing email(string) and token(string)

export const deliverPasswordResetToken: PasswordResetDelivery = async ({ email }) => {
  console.info("Password reset delivery requested", { account: email });
};

//Creates function deliver password reset token based on the function type
//Supposed to accept email and token but token is ignored for now
//It will return the account object tnat has the email
