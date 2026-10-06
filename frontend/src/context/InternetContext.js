import React, { createContext, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export const InternetContext = createContext();

// How long the connection must stay down before the offline screen appears.
const OFFLINE_DELAY_MS = 2000;

export const InternetProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [checked, setChecked] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Only the phone's own connection counts. NetInfo's "internet reachable" check pings a Google
      // server, which can fail for a moment on slow or restricted Wi-Fi; treating that as offline
      // made the offline screen flash and steal focus from the field being typed in.
      const online = state.isConnected !== false;
      clearTimeout(timer.current);
      if (online) {
        setIsConnected(true);
      } else {
        timer.current = setTimeout(() => setIsConnected(false), OFFLINE_DELAY_MS);
      }
      setChecked(true);
    });
    return () => {
      clearTimeout(timer.current);
      unsubscribe();
    };
  }, []);

  return (
    <InternetContext.Provider value={{ isConnected, checked }}>
      {children}
    </InternetContext.Provider>
  );
};
