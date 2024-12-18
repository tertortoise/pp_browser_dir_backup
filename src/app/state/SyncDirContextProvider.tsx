import { createContext, useContext, useReducer, PropsWithChildren, Dispatch, useRef, MutableRefObject } from 'react';

import { Action, RootDirHandleRefs, SORT_ASC, SyncFlowState } from '../types/viewTypes';
import { reducer } from './syncDirReducer';
import { SYNC_STEP_SCAN, LEFT, ACTION_STATUS_INIT, RIGHT, SYNC_STEP_DIFF, SYNC_STEP_SYNC, ACTION_NOT_REQUIRED } from '../types/servicesTypes';
import { SyncManager } from '../services/SyncManager';
import { getDefaultCaseSensitivity } from '../containers/utils';

const initialState: SyncFlowState = {
  [SYNC_STEP_SCAN]: {
    [LEFT]: { status: ACTION_STATUS_INIT },
    [RIGHT]: { status: ACTION_STATUS_INIT },
  },
  [SYNC_STEP_DIFF]: {
    status: ACTION_NOT_REQUIRED,
  },
  [SYNC_STEP_SYNC]: ACTION_NOT_REQUIRED,
  viewOptions: {
    sortedByName: SORT_ASC,
    isFileSizeVisible: true,
    isFileMtimeVisible: true,
    rowsPerPage: 25,
  },
  syncOptions: { 
    isCaseSensitive: getDefaultCaseSensitivity(),
    bufferCopyMaxSize: 1e7,
    numberTransactionsMax: 5,
  },
  messages: [],
};

const StateContext = createContext<SyncFlowState>({...initialState});
const DirRefsContext = createContext<MutableRefObject<RootDirHandleRefs>>({current: { [LEFT]: null, [RIGHT]: null }});
const SyncManagerRefContext = createContext<MutableRefObject<SyncManager | null>>({current: null});

// init
// eslint-disable-next-line @typescript-eslint/no-empty-function
const DispatchContext = createContext<Dispatch<Action>>(() => {});

export function SyncDirProvider({ children }: PropsWithChildren<unknown>) {

  const rootDirRefs = useRef<RootDirHandleRefs>({ [LEFT]: null, [RIGHT]: null });
  const syncManagerRef = useRef<SyncManager | null>(null);

  const [state, dispatch] = useReducer(
    reducer,
    initialState
  );

  return (
    <DirRefsContext.Provider value={rootDirRefs}>
      <SyncManagerRefContext.Provider value={syncManagerRef}>
        <StateContext.Provider value={state}>
          <DispatchContext.Provider value={dispatch}>
            {children}
          </DispatchContext.Provider>
        </StateContext.Provider>
      </SyncManagerRefContext.Provider>
    </DirRefsContext.Provider>

  );
};

export function useSyncState() {
  return useContext(StateContext);
};

export function useSyncStateDispatch() {
  return useContext(DispatchContext);
};

export function useDireRefs() {
  return useContext(DirRefsContext);
};

export function useSyncManagerRef() {
  return useContext(SyncManagerRefContext);
};
