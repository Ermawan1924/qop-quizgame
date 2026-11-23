// If ADMIN_PASSWORD is not set, the admin panel is open to everyone.
export const authed = (key) => !process.env.ADMIN_PASSWORD || key === process.env.ADMIN_PASSWORD;
