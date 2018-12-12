import * as steam from "@gameye/steam-api";
import { SteamApi } from "@gameye/steam-api";
import { EventEmitter } from "events";
import fetch from "node-fetch";
import * as querystring from "querystring";
import { createLogger } from "./log";

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

export class UpdaterService extends EventEmitter {

    //#region errors

    public static ResponseError = ResponseError;

    //#endregion

    private log = createLogger(this);

    private promise?: Promise<void>;
    private timeoutHandle?: NodeJS.Timeout;
    private readonly steamApi: steam.SteamApi;
    private readonly gameInfo: { [name: string]: UpdaterServiceGameInfo };
    private readonly config: UpdaterServiceConfig;

    constructor(config: UpdaterServiceConfig) {
        super();

        config = this.config =
            this.normalizeConfig(config);

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

    public async start() {
        this.log("start");

        await this.cycle();
        this.emit("started");
    }

    public async stop() {
        this.log("stop");

        if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
        this.timeoutHandle = undefined;

        if (this.promise) await this.promise;
        this.emit("stopped");
    }

    private async step() {
        this.log("step");

        const { gameInfo } = this;

        for (const [name, { steamId, version }] of Object.entries(gameInfo)) {
            try {
                const requiredVersion = await this.getRequiredVersion(steamId, version);

                if (version === requiredVersion) continue;

                gameInfo[name] = { steamId, version: requiredVersion };

                if (requiredVersion === 0) continue;

                await this.triggerBuild(name);
            }
            catch (error) {
                this.emit("error", error);
            }
        }
    }

    private cycle = () => this.promise = this.step().
        catch(error => this.emit("error", error)).
        then(() => {
            const { interval } = this.config;
            this.timeoutHandle = setTimeout(this.cycle, interval);
        })

    private async getRequiredVersion(steamId: number, version: number) {
        const { steamApi } = this;
        const { response } = await steamApi.ISteamApps.UpToDateCheck1(steamId, version);
        if (response.error) throw new Error(response.error);

        if (response.up_to_date) return version;
        const requiredVersion = response.required_version;

        return requiredVersion as number;
    }

    private async triggerBuild(tag: string) {
        this.emit("build", tag);

        const { circleApiEndpoint, circleApiUserToken } = this.config;
        const query = querystring.stringify({
            "circle-token": circleApiUserToken,
        });

        const url = `${circleApiEndpoint}/project/github/Gameye/steam-images/build?${query}`;

        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify({ tag }),
            headers: { "Content-Type": "application/json" },
        });
        const responseData = await response.json();
        if (!response.ok) {
            throw new ResponseError(response.status, responseData.message);
        }
    }

    private normalizeConfig(config: UpdaterServiceConfig): UpdaterServiceConfig {
        let {
            circleApiEndpoint,
            steamApiEndpoint,
        } = config;

        circleApiEndpoint = circleApiEndpoint && circleApiEndpoint.replace(/\/+$/, "");
        steamApiEndpoint = steamApiEndpoint && steamApiEndpoint.replace(/\/+$/, "");

        config = {
            ...config,
            ...{
                circleApiEndpoint,
                steamApiEndpoint,
            },
        };

        return config;
    }

}
