enum AttemptStatus {
    FULFILLED = 'fulfilled',
    REJECTED = 'rejected',
    PENDING = 'pending',
}

type Attempt = {
    value?: unknown;
    error?: string;
    status: AttemptStatus;
};

const promisify = (
    fn: (
        resolve: (value: unknown) => void,
        reject: (reason?: any) => void,
    ) => Promise<unknown> | void,
) => new Promise(fn);


export const keepTrying = async (
    fn: () => Promise<unknown>,
    retries = 3,
    delay = 1000,
) => {
    function* retry() {
        let count = retries;
        while (true) {
            yield promisify((res) =>
                fn()
                    .then((value) =>
                        res({ value, status: AttemptStatus.FULFILLED }),
                    )
                    .catch((error) =>
                        res({ error, status: AttemptStatus.REJECTED }),
                    ),
            );
            count--;
            if (count === 0) return;
            yield promisify((res) => {
                setTimeout(() => res({ status: AttemptStatus.PENDING }), delay);
            });
        }
    }

    for await (let attempt of retry()) {
        if ((attempt as Attempt).status === AttemptStatus.FULFILLED) {
            return (attempt as Attempt).value;
        }
        if ((attempt as Attempt).status === AttemptStatus.REJECTED) {
            console.error((attempt as Attempt).error);
        }
    }

    throw new Error(`"keepTrying" was not resolved after ${retries} tries`);
};
