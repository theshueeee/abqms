import { RequestHandler } from "express";
import { SessionActorType, StaffRole } from "@prisma/client";
import { prisma } from "../db";
import { hashToken } from "./security";

export type AuthenticatedRequest = Parameters<RequestHandler>[0];
//Makes request type as request handler from express lib

function readCookie(request: AuthenticatedRequest, name: string): string | undefined {
  //The function receives request and name as the parameter
  //Function returns something as undefined or string
  const header = request.header("cookie");
  //Reads http cookie header
  return header
    ?.split(";")
    //Uses optional chaining
    //If cookie is empty it returns undefined
    //Splits cookies at semicolons
    .map((part) => part.trim())
    //Removes whitespace around each cookie segment
    .map((part) => part.split("="))
    //Splits cookie at equal sign to key and value 
    .find(([key]) => key === name)?.[1];
    //Finds cookies whos key matches the name parameter and returns the value
    //If its undefined there needs to be something at the receiving end that fights it
}

export function requireAuth(roles?: StaffRole[]): RequestHandler {
  //Accepts an array of staff roles (optional)
  //Returns a request handler type
  return async (request, response, next) => {
    //returns async express middleware function
    const token = readCookie(request, "dq_session");
    //gets cookie named dq_session and stores it in token
    if (!token) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    // if no token returns a 401

    const session = await prisma.session.findUnique({
      where: { token_hash: hashToken(token) },
      include: { patient: true, staff: true },
    });
    //Searches the db for raw token
    //It hashes the raw token simultaneous as the raw token cannot be stored or queried
    //stores it inside token_hash
    //Loads the patient and staff records as well

    if (!session || session.revoked_at || session.expires_at <= new Date()) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    //If session is absent, revoked or expired then it returns 401

    if (session.patient && session.patient.account_status === "suspended") {
      response.status(403).json({ error: "Account is suspended" });
      return;
    }
    //If the patient is suspended then it returns 403

    if (session.staff && (!session.staff.is_active || (roles && !roles.includes(session.staff.role)))) {
      response.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    //If staff is not active or doesnt have a role then it returns status 403

    request.auth = {
      //Adds authenticated user info to the request object for later route handlers
      actorType: session.actor_type,
      //is the user patient or staff?
      patientId: session.patient_id ?? undefined,
      staffId: session.staff_id ?? undefined,
      role: session.staff?.role,
      //Stores the staff role
    };
    next();

    //Allows request to be continued to the next middleware
  };
}
