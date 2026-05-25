export enum RCode {
  NOERROR  = 0,
  FORMERR  = 1,
  SERVFAIL = 2,
  NXDOMAIN = 3,
  NOTIMP   = 4,
  REFUSED  = 5,
}

export enum RecordType {
  A     = 1,
  NS    = 2,
  CNAME = 5,
  SOA   = 6,
  AAAA  = 28,
}

export enum RecordClass {
  IN = 1,
}

export interface DnsQuestion {
  name: string;
  type: RecordType;
  class: RecordClass;
}

export interface DnsRecord {
  name: string;
  type: RecordType;
  class: RecordClass;
  ttl: number;
  data: string;
}

export interface DnsResponse {
  id: number;
  rcode: RCode;
  questions: DnsQuestion[];
  answers: DnsRecord[];
  authoritative: boolean;
  truncated: boolean;
}

export interface QueryResult {
  server: string;
  serverIp: string;
  domain: string;
  response: DnsResponse | null;
  rttMs: number;
  error: string | null;
}
