let routes = [];
let middleware = null;
export function registerRoutes(r) {
    routes = r;
}
export function getRoutes() {
    return routes;
}
export function registerMiddleware(m) {
    middleware = m;
}
export function getMiddleware() {
    return middleware;
}
