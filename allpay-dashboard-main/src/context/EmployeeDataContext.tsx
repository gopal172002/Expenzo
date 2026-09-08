import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  startTransition,
} from "react";
import { employeeApi } from "../api/employeeApi";
import type { Employee, EmployeeDashboardSummary, PaymentProof, Transaction } from "../types";

interface EmployeeDataContextShape {
  employee: Employee | null;
  transactions: Transaction[];
  paymentProofs: PaymentProof[];
  summary: EmployeeDashboardSummary | null;
  isBootstrapping: boolean;
  errorMessage: string;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  filteredTransactions: Transaction[];
  refresh: () => Promise<void>;
  submitPaymentProof: (form: FormData) => Promise<void>;
  uploadReceipt: (transactionId: string, file: File) => Promise<void>;
}

type PortalState = {
  employee: Employee | null;
  transactions: Transaction[];
  paymentProofs: PaymentProof[];
  summary: EmployeeDashboardSummary | null;
  isBootstrapping: boolean;
  errorMessage: string;
  statusFilter: string;
  search: string;
};

type PortalAction =
  | { type: "load_start" }
  | {
      type: "load_success";
      employee: Employee | null;
      transactions: Transaction[];
      paymentProofs: PaymentProof[];
      summary: EmployeeDashboardSummary | null;
    }
  | { type: "load_error"; message: string }
  | { type: "set_status_filter"; value: string }
  | { type: "set_search"; value: string }
  | { type: "add_payment_proof"; paymentProof: PaymentProof; transaction: Transaction }
  | { type: "update_receipt"; transactionId: string; receiptUrl: string };

const initialPortalState: PortalState = {
  employee: null,
  transactions: [],
  paymentProofs: [],
  summary: null,
  isBootstrapping: true,
  errorMessage: "",
  statusFilter: "",
  search: "",
};

function portalReducer(state: PortalState, action: PortalAction): PortalState {
  switch (action.type) {
    case "load_start":
      return { ...state, isBootstrapping: true, errorMessage: "" };
    case "load_success":
      return {
        ...state,
        employee: action.employee,
        transactions: action.transactions,
        paymentProofs: action.paymentProofs,
        summary: action.summary,
        isBootstrapping: false,
        errorMessage: "",
      };
    case "load_error":
      return { ...state, isBootstrapping: false, errorMessage: action.message };
    case "set_status_filter":
      return { ...state, statusFilter: action.value };
    case "set_search":
      return { ...state, search: action.value };
    case "add_payment_proof":
      return {
        ...state,
        paymentProofs: [action.paymentProof, ...state.paymentProofs],
        transactions: [action.transaction, ...state.transactions],
      };
    case "update_receipt":
      return {
        ...state,
        transactions: state.transactions.map((tx) =>
          tx.id === action.transactionId ? { ...tx, receiptUrl: action.receiptUrl } : tx
        ),
      };
    default:
      return state;
  }
}

const EmployeeDataContext = createContext<EmployeeDataContextShape | undefined>(undefined);

export const EmployeeDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(portalReducer, initialPortalState);

  const load = useCallback(async () => {
    dispatch({ type: "load_start" });
    try {
      const data = await employeeApi.bootstrap();
      dispatch({
        type: "load_success",
        employee: data.employee,
        transactions: data.transactions,
        paymentProofs: data.paymentProofs,
        summary: data.summary,
      });
    } catch (e) {
      dispatch({ type: "load_error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const filteredTransactions = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    return state.transactions.filter((tx) => {
      if (state.statusFilter && tx.status !== state.statusFilter) return false;
      if (!q) return true;
      const blob = `${tx.merchantName} ${tx.upiRefId} ${tx.id}`.toLowerCase();
      return blob.includes(q);
    });
  }, [state.transactions, state.statusFilter, state.search]);

  const submitPaymentProof = useCallback(async (form: FormData) => {
    const res = await employeeApi.submitPaymentProof(form);
    dispatch({
      type: "add_payment_proof",
      paymentProof: res.paymentProof,
      transaction: res.transaction,
    });
  }, []);

  const uploadReceipt = useCallback(async (transactionId: string, file: File) => {
    const res = await employeeApi.uploadReceipt(transactionId, file);
    dispatch({ type: "update_receipt", transactionId, receiptUrl: res.receiptUrl });
  }, []);

  const value = useMemo(
    () => ({
      employee: state.employee,
      transactions: state.transactions,
      paymentProofs: state.paymentProofs,
      summary: state.summary,
      isBootstrapping: state.isBootstrapping,
      errorMessage: state.errorMessage,
      statusFilter: state.statusFilter,
      setStatusFilter: (value: string) => dispatch({ type: "set_status_filter", value }),
      search: state.search,
      setSearch: (value: string) => dispatch({ type: "set_search", value }),
      filteredTransactions,
      refresh: load,
      submitPaymentProof,
      uploadReceipt,
    }),
    [state, filteredTransactions, load, submitPaymentProof, uploadReceipt]
  );

  return <EmployeeDataContext.Provider value={value}>{children}</EmployeeDataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useEmployeeData() {
  const ctx = use(EmployeeDataContext);
  if (!ctx) throw new Error("useEmployeeData must be used within EmployeeDataProvider");
  return ctx;
}
