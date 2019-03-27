import * as steam from "@gameye/steam-api";
import { SteamApi } from "@gameye/steam-api";
import { EventEmitter } from "events";
import * as createHttpError from "http-errors";
import fetch from "node-fetch";
import * as querystring from "querystring";

export interface UpdaterServiceGameConfig {
    name: string;
    steamId: number;
    repos: string[];
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

class InvalidLatestVersionFormat extends Error {
    constructor(public latest: string) {
        super(`invalid latest version format '${latest}'`);
    }
}

//#endregion

export class UpdaterService extends EventEmitter {

    //#region errors

    public static InvalidLatestVersionFormat = InvalidLatestVersionFormat;

    //#endregion

    private promise?: Promise<void>;
    private timeoutHandle?: NodeJS.Timeout;
    private readonly steamApi: steam.SteamApi;
    private readonly versionMap: { [name: string]: number };
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
        this.versionMap = config.games.reduce(
            (o, { name }) => Object.assign(o, {
                [name]: 0,
            }),
            {},
        );
    }

    public async start() {
        const { versionMap, config } = this;

        for (const { name, steamId } of config.games) {
            const latestVersion = await this.getRequiredVersion(steamId, 0);

            versionMap[name] = latestVersion;
        }

        await this.cycle();
        this.emit("started");
    }

    public async stop() {
        if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
        this.timeoutHandle = undefined;

        if (this.promise) await this.promise;
        this.emit("stopped");
    }

    private async step() {
        const { versionMap, config } = this;

        for (const { name, steamId, repos } of config.games) {
            try {
                const version = versionMap[name];
                const requiredVersion = await this.getRequiredVersion(steamId, version);

                if (version === requiredVersion) continue;

                versionMap[name] = requiredVersion;

                if (requiredVersion === 0) continue;

                await Promise.all(
                    repos.map(repo => this.triggerBuild(repo)),
                );
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

    private async triggerBuild(repo: string) {
        this.emit("build", repo);

        try {
            const { circleApiEndpoint, circleApiUserToken } = this.config;
            const query = querystring.stringify({
                "circle-token": circleApiUserToken,
            });

            const url = `${circleApiEndpoint}/project/github/Gameye/${repo}/build?${query}`;

            const response = await fetch(url, {
                method: "POST",
                body: JSON.stringify({ branch: "master" }),
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) {
                throw createHttpError(response.status, response.statusText);
            }
        }
        catch (error) {
            this.emit("error", error);
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
