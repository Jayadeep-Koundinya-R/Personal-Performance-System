import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type CallWindowMode = "embedded" | "floating_pip" | "popout_window";

export interface ActiveCallState {
  isActive: boolean;
  groupId: string;
  groupName: string;
  windowMode: CallWindowMode;
}

interface ActiveCallContextType {
  callState: ActiveCallState;
  startCall: (groupId: string, groupName: string) => void;
  endCall: () => void;
  setWindowMode: (mode: CallWindowMode) => void;
  popoutToNewWindow: () => void;
}

const ActiveCallContext = createContext<ActiveCallContextType | null>(null);

export const ActiveCallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [callState, setCallState] = useState<ActiveCallState>({
    isActive: false,
    groupId: "",
    groupName: "",
    windowMode: "embedded",
  });

  const startCall = useCallback((groupId: string, groupName: string) => {
    setCallState({
      isActive: true,
      groupId,
      groupName,
      windowMode: "embedded",
    });
  }, []);

  const endCall = useCallback(() => {
    setCallState({
      isActive: false,
      groupId: "",
      groupName: "",
      windowMode: "embedded",
    });
  }, []);

  const setWindowMode = useCallback((mode: CallWindowMode) => {
    setCallState((prev) => ({ ...prev, windowMode: mode }));
  }, []);

  const popoutToNewWindow = useCallback(() => {
    if (!callState.groupId) return;
    const url = `${window.location.origin}${window.location.pathname}#/focus-call/${callState.groupId}?name=${encodeURIComponent(callState.groupName)}`;
    window.open(url, `PPS_Focus_Call_${callState.groupId}`, "width=1040,height=740,menubar=no,toolbar=no,location=no,status=no");
    setCallState((prev) => ({ ...prev, windowMode: "popout_window" }));
  }, [callState]);

  return (
    <ActiveCallContext.Provider
      value={{
        callState,
        startCall,
        endCall,
        setWindowMode,
        popoutToNewWindow,
      }}
    >
      {children}
    </ActiveCallContext.Provider>
  );
};

export function useActiveCall() {
  const context = useContext(ActiveCallContext);
  if (!context) {
    throw new Error("useActiveCall must be used within an ActiveCallProvider");
  }
  return context;
}
