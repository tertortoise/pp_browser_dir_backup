
import scenarios from '../tests/scenarios';
import { makeDirFromScenarioSide, compareTransactions } from '../tests/testUtils';
import { SyncManager } from './SyncManager';

describe('tests for diff', () => {

    Object.entries(scenarios).forEach(([scenarioCode, scenario]) => {
    
    
        test(`${scenarioCode}, isCaseSensitive: ${scenario.isCaseSensitive}, ${scenario.description}`, () => {

            const isCaseSensitive = scenario.isCaseSensitive;        
            const dirLeft = makeDirFromScenarioSide('rootLeft', scenario.left, isCaseSensitive);
            const dirRight = makeDirFromScenarioSide('rootRight', scenario.right, isCaseSensitive);

            const syncManager = new SyncManager(dirLeft, dirRight, {isCaseSensitive });

            expect(syncManager.rootTransaction?.children).toBeTruthy();

            // @ts-expect-error if null it will throw on prev expect
            expect(compareTransactions(syncManager.rootTransaction.children, 'rootTransaction', scenario.expected, isCaseSensitive)).toBeTruthy();

        });

    })


});