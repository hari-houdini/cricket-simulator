/**
 * The id of the connection notice. A fixed id lets the notice be replaced or
 * dismissed without holding a reference to it, so a second failed read does not
 * stack a copy.
 */
export const CONNECTION_NOTICE_ID = "connection";
