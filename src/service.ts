import { SteamApi } from "@gameye/steam-api";
import { AbortSignal } from "abort-controller";
import * as delay from "delay";
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
    branch: string;
    steamApiEndpoint: string;
    steamApiKey: string;
    circleApiEndpoint: string;
    circleApiUserToken: string;
    games: UpdaterServiceGameConfig[];
}

export class UpdaterService extends EventEmitter {

    public iteration = 0;

    private readonly steamApi: SteamApi;
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

    public async run(signal: AbortSignal) {
        await this.initialize();

        while (!signal.aborted) {
            await this.iterate();
            await delay(this.config.interval, { signal });
        }
    }

    public async initialize() {
        this.emit("intialize");

        const { versionMap, config } = this;

        for (const { name, steamId } of config.games) {
            const latestVersion = await this.getRequiredVersion(steamId, 0);

            this.emit("intialize-version", name, latestVersion);
            versionMap[name] = latestVersion;
        }
    }

    private async iterate() {
        this.emit("iterate");

        this.iteration++;

        const { versionMap, config } = this;

        for (const { name, steamId, repos } of config.games) {
            try {
                const version = versionMap[name];
                const requiredVersion = await this.getRequiredVersion(steamId, version);

                if (version === requiredVersion) continue;

                this.emit("update-version", name, requiredVersion, version);
                versionMap[name] = requiredVersion;

                if (requiredVersion === 0) continue;

                await Promise.all(
                    repos.map(repo => this.triggerBuild(repo, config.branch)),
                );
            }
            catch (error) {
                this.emit("error", error);
            }
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

    private async triggerBuild(repo: string, branch: string) {
        this.emit("build", repo);

        try {
            const { circleApiEndpoint, circleApiUserToken } = this.config;
            const query = querystring.stringify({
                "circle-token": circleApiUserToken,
            });

            const url = `${circleApiEndpoint}/project/github/Gameye/${repo}/build?${query}`;

            const response = await fetch(url, {
                method: "POST",
                body: JSON.stringify({ branch }),
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
