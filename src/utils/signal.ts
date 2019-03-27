export function waitForSignal(...signals: NodeJS.Signals[]) {
    return new Promise<void>(
        resolve => {
            const end = () => {
                signals.forEach(signal => process.removeListener(signal, end));
                resolve();
            };
            signals.forEach(signal => process.addListener(signal, end));
        },
    );
}
