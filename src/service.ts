import * as steam from "@gameye/steam-api";
import { SteamApi } from "@gameye/steam-api";
import fetch from "node-fetch";

export interface UpdaterServiceGameConfig {
    name: string;
    steamId: number;
}

export interface UpdaterServiceConfig {
    interval: number;
    steamApiEndpoint: string;
    steamApiKey: string;
    circleApiEndpoint: string;
    circleApiUserToken: string;
    games: UpdaterServiceGameConfig[];
}

//#region errors

// tslint:disable:max-classes-per-file
class AlreadyStoppedError extends Error {
    constructor() {
        super("already stopped");
    }
}

// tslint:disable:max-classes-per-file
class AlreadyStartedError extends Error {
    constructor() {
        super("already started");
    }
}

// tslint:disable:max-classes-per-file
class ResponseError extends Error {
    constructor(public code: number, message: string) {
        super(message);
    }
}

//#endregion

interface UpdaterServiceGameInfo {
    steamId: number;
    version: number;
}

export class UpdaterService {

    //#region errors

    public static AlreadyStoppedError = AlreadyStoppedError;
    public static AlreadyStartedError = AlreadyStartedError;
    public static ResponseError = ResponseError;

    //#endregion

    private intervalHandle?: NodeJS.Timeout;
    private readonly steamApi: steam.SteamApi;
    private readonly gameInfo: { [name: string]: UpdaterServiceGameInfo };

    constructor(private config: UpdaterServiceConfig) {
        const { steamApiEndpoint, steamApiKey } = config;
        this.steamApi = new SteamApi({
            ApiEndpoint: steamApiEndpoint,
            ApiKey: steamApiKey,
        });
        this.gameInfo = config.games.reduce(
            (o, { name, steamId }) => Object.assign(o, {
                [name]: {
                    steamId,
                    version: 0,
                } as UpdaterServiceGameInfo,
            }),
            {},
        );
    }

    public start() {
        if (this.intervalHandle) throw new AlreadyStartedError();

        const { interval } = this.config;
        this.intervalHandle = setInterval(() => this.step(), interval);
    }

    public stop() {
        if (!this.intervalHandle) throw new AlreadyStoppedError();

        clearInterval(this.intervalHandle);
        this.intervalHandle = undefined;
    }

    private async initialize() {
        // get versions from cdn
    }

    private async step() {
        const { gameInfo } = this;

        for (const [name, { steamId, version }] of Object.entries(gameInfo)) {
            const requiredVersion = await this.getRequiredVersion(steamId, version);

            if (version === requiredVersion) continue;

            gameInfo[name] = { steamId, version: requiredVersion };

            if (requiredVersion === 0) continue;

            this.triggerBuild(name);
        }
    }

    private async getRequiredVersion(steamId: number, version: number) {
        const { steamApi } = this;
        const { response } = await steamApi.ISteamApps.UpToDateCheck1(steamId, version);
        if (response.error) throw new Error(response.error);

        if (response.up_to_date) return version;
        const requiredVersion = response.required_version;

        return requiredVersion as number;
    }

    private async triggerBuild(tag: string) {
        const { circleApiEndpoint, circleApiUserToken } = this.config;
        const url = `${circleApiEndpoint}/project/github/Gameye/steam-images/build?circle-token=${circleApiUserToken}`;
        const response = await fetch(url, {
            body: JSON.stringify({ tag }),
            headers: { "Content-Type": "application/json" },
        });
        const responseData = await response.json();
        if (!response.ok) {
            throw new ResponseError(response.status, responseData.message);
        }
    }

}
