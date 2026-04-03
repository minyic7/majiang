var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new
{
    name = "majiang-server",
    stack = "aspnet-core",
    status = "ok"
}));

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    service = "server",
    utc = DateTimeOffset.UtcNow
}));

app.MapGet("/api/info", () => Results.Ok(new
{
    project = "majiang",
    backend = "csharp",
    client = "unity",
    version = "0.1.0"
}));

app.Run();
