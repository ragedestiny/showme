import type { Response } from "express";
import type { z } from "zod";

// Answers with `data`, cut down to exactly what `schema` (one of the
// contract's answers, contract/api.ts) lists. A database document holds
// more than any page needs: a profile has the student's email, Google id and
// login details. Only the fields the contract names leave the server; zod
// drops the rest.
//
// The JSON round trip first turns database values into what JSON sends (ids
// and dates become text), which is what the contract describes. If stored
// data doesn't fit the contract, parse throws: the route's catch answers
// with an error and the request's log line says why, rather than anything
// unchecked being sent.
export const answer = (
  res: Response,
  status: number,
  schema: z.ZodType,
  data: unknown
) => res.status(status).json(schema.parse(JSON.parse(JSON.stringify(data))));
