import axios from "axios";
import type {
  EditSentenceBody,
  LoginBody,
  NewSentenceBody,
  ReviewBody,
  ReviewDecision,
  Sentence,
  SentenceWithAuthor,
  TellSentence,
  User,
} from "./types";

// Every request goes to /api on this same site. A proxy forwards it to the
// backend: the proxy in vite.config.ts during `npm start`, public/_redirects on Netlify.
// Because the browser only ever talks to this site, it automatically sends the
// httpOnly login cookie with each request; no code here touches the token.
export const API = axios.create({ baseURL: "/api" });

// retrieve tell sentences
export const fetchTellSentences = () => API.get<TellSentence[]>("/");

// exchange the Google ID token for our login cookie
export const loginUser = (token: string) =>
  API.post("/auth", { token } satisfies LoginBody);

// retrieve the signed-in user's info
export const fetchUser = () => API.get<User>("/Login");

// retrieve/create/update user sentences on mypage
export const fetchUserSentences = () => API.get<Sentence[]>("/MyPage");
export const createSentence = (newSentence: NewSentenceBody) =>
  API.post<Sentence>("/MyPage", newSentence);
export const editUserSentences = (editedSentence: EditSentenceBody) =>
  API.patch<Sentence>("/MyPage", editedSentence);

// logout User
export const logoutUser = () => API.post("/Logout");

// retrieve/approve/reject sentences awaiting approval
export const fetchApprovalSentences = () =>
  API.get<SentenceWithAuthor[]>("/Admin");
export const updatePendingApprovalSentences = (
  status: ReviewDecision,
  sentence: SentenceWithAuthor
) =>
  // The server answers with the queue as it is after this decision
  API.patch<SentenceWithAuthor[]>("/Admin", {
    status,
    sentence,
  } satisfies ReviewBody);

// On a fresh load of some pages, index.html starts a request before the app's
// code has even downloaded (see vite.config.ts). Each one is handed over once:
// coming back to the page later asks the server again, for a fresh answer.
const takeEarlyRequest = (path: string) => {
  const early = window.earlyRequests?.[path];
  if (early) delete window.earlyRequests?.[path];
  return early;
};

// retrieve approved sentences: index.html may have asked already. If that
// didn't work, ask again the usual way, which reports failures as usual.
export const fetchApprovedSentences = async (): Promise<{
  data: SentenceWithAuthor[];
}> => {
  const early = takeEarlyRequest("/Collections");
  if (early) {
    try {
      const response = await early;
      if (response.ok) return { data: await response.json() };
    } catch {
      // no answer (e.g. offline): ask again below
    }
  }
  return API.get<SentenceWithAuthor[]>("/Collections");
};
