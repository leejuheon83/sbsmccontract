import type { User } from '../types/contract';

/**
 * 최초 기동(localStorage 비어 있음) 시 시드되는 사용자 목록.
 * 비관리자 초기 비밀번호는 사번과 동일(내부 데모용).
 */
export const DEFAULT_SEED_USERS: User[] = [
  {
    id: 'juheonlee@sbs.co.kr',
    email: 'juheonlee@sbs.co.kr',
    employeeId: 'admin',
    loginPassword: 'admin',
    name: '이주헌(관리자)',
    department: '경영지원팀',
    isActive: true,
  },
  {
    id: 'hgyeong.choi@sbs.co.kr',
    email: 'hgyeong.choi@sbs.co.kr',
    employeeId: '150009',
    loginPassword: '150009',
    name: '최형경',
    department: '영업6팀',
    isActive: true,
  },
  {
    id: 'lee230@sbs.co.kr',
    email: 'lee230@sbs.co.kr',
    employeeId: '170002',
    loginPassword: '170002',
    name: '이세영',
    department: '영업3팀',
    isActive: true,
  },
  {
    id: 'kdoc@sbs.co.kr',
    email: 'kdoc@sbs.co.kr',
    employeeId: '210015',
    loginPassword: '210015',
    name: '허준',
    department: '영업3팀',
    isActive: true,
  },
  {
    id: 'yeonjae.na@sbs.co.kr',
    email: 'yeonjae.na@sbs.co.kr',
    employeeId: '250007',
    loginPassword: '250007',
    name: '나연',
    department: '광고기획팀',
    isActive: true,
  },
  {
    id: 'eunsil37@sbs.co.kr',
    email: 'eunsil37@sbs.co.kr',
    employeeId: '130013',
    loginPassword: '130013',
    name: '정은실',
    department: '사업발전팀',
    isActive: true,
  },
];

/** 시스템 예약 사번 admin 행 — ensureSystemAdminInUserList 등에서 사용 */
export const DEFAULT_ADMIN_USER: User = DEFAULT_SEED_USERS[0]!;

export const RESERVED_SYSTEM_EMPLOYEE_ID = 'admin';
