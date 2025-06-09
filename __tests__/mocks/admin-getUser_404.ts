// https://admin.googleapis.com/admin/directory/v1/users/notcreated@foo.com
export default {
  error: {
    code: 404,
    message: "Resource Not Found: userKey",
    errors: [
      {
        message: "Resource Not Found: userKey",
        domain: "global",
        reason: "notFound",
      },
    ],
  },
};
