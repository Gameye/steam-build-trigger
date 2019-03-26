import * as express from "express";
import * as http from "http";
import * as net from "net";

export class TestContext {

    public static async with<T>(job: (context: TestContext) => PromiseLike<T> | T): Promise<T> {
        const context = new this();
        try {
            await context.setup();
            return await job(context);
        }
        finally {
            await context.teardown();
        }
    }

    public readonly steamApiServer = http.createServer(this.getSteamApiMock());
    public readonly circleApiServer = http.createServer(this.getCircleApiMock());

    public readonly steamApiEndpoint = "http://localhost:8001";
    public readonly circleApiEndpoint = "http://localhost:8002";

    private readonly socketSet = new Set<net.Socket>();

    private constructor() {
    }

    //#region initialize

    private getCircleApiMock() {
        const app = express();

        app.use((req, res, next) => {
            // place your breakpoint here!
            next();
        });

        app.post("/project/github/Gameye/:repo/build", (req, res, next) => {
            res.send({
                status: 200,
                body: "Build created",
            });
        });
        return app;
    }

    private getSteamApiMock() {
        const app = express();

        app.use((req, res, next) => {
            // place your breakpoint here!
            next();
        });

        app.get("/ISteamApps/UpToDateCheck/v1", (req, res, next) => {
            const { appid, version } = req.query;

            switch (appid) {
                case "440":
                    switch (version) {
                        case "0":
                            res.send({
                                response: {
                                    success: true,
                                    up_to_date: false,
                                    version_is_listable: false,
                                    required_version: 4783667,
                                    message: "Your server is out of date, please upgrade",
                                },
                            });
                            break;

                        case "4783668":
                            res.send({
                                response: {
                                    success: true,
                                    up_to_date: true,
                                    version_is_listable: true,
                                },
                            });
                            break;

                        default:
                            res.send({
                                response: {
                                    success: true,
                                    up_to_date: false,
                                    version_is_listable: false,
                                    required_version: 4783668,
                                    message: "Your server is out of date, please upgrade",
                                },
                            });
                            break;
                    }
                    break;

                case "730":
                    switch (version) {
                        case "0":
                            res.send({
                                response: {
                                    success: true,
                                    up_to_date: false,
                                    version_is_listable: false,
                                    required_version: 13666,
                                    message: "Your server is out of date, please upgrade",
                                },
                            });
                            break;

                        case "13666":
                            res.send({
                                response: {
                                    success: true,
                                    up_to_date: true,
                                    version_is_listable: true,
                                },
                            });
                            break;

                        default:
                            res.send({
                                response: {
                                    success: true,
                                    up_to_date: false,
                                    version_is_listable: false,
                                    required_version: 13666,
                                    message: "Your server is out of date, please upgrade",
                                },
                            });
                            break;
                    }
                    break;

                default:
                    res.send({
                        response: {
                            success: false,
                            error: "Couldn't get app info for the app specified.",
                        },
                    });
                    break;

            }

        });

        return app;
    }

    //#endregion

    //#region setup / teardown

    private async setup() {
        const { circleApiServer, steamApiServer } = this;
        circleApiServer.on("connection", this.onConnection);
        steamApiServer.on("connection", this.onConnection);
        await Promise.all([
            new Promise(resolve => steamApiServer.listen(8001, resolve)),
            new Promise(resolve => circleApiServer.listen(8002, resolve)),
        ]);
    }

    private async teardown() {
        const { circleApiServer, steamApiServer } = this;
        this.socketSet.forEach(socket => socket.destroy());
        await Promise.all([
            new Promise(resolve => circleApiServer.close(resolve)),
            new Promise(resolve => steamApiServer.close(resolve)),
        ]);
    }

    //#endregion

    private onConnection = (socket: net.Socket) => {
        this.socketSet.add(socket);
        socket.on("close", () => this.socketSet.delete(socket));
    }
}
