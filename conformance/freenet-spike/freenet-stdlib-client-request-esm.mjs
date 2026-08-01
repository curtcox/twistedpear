/**
 * ESM facade over CJS `@freenetorg/freenet-stdlib/client-request` for Bare `--linked` packs.
 */
import api from "../../node_modules/@freenetorg/freenet-stdlib/dist/src/client-request.js";

const clientRequest = api?.default ?? api;

export const ClientRequest = clientRequest.ClientRequest;
export const ClientRequestT = clientRequest.ClientRequestT;
export const ClientRequestType = clientRequest.ClientRequestType;
export const RelatedContracts = clientRequest.RelatedContracts;
export const RelatedContractsT = clientRequest.RelatedContractsT;

export default clientRequest;
