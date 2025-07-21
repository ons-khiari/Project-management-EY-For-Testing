var builder = WebApplication.CreateBuilder(args);

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000") // Allow frontend origin
                  .AllowAnyMethod()  // Allow all HTTP methods (GET, POST, PUT, DELETE)
                  .AllowAnyHeader()  // Allow any headers
                  .AllowCredentials(); // Allow cookies/auth headers
        });
});

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

// Use CORS policy (VERY IMPORTANT: It must be before MapReverseProxy)
app.UseCors("AllowFrontend");

app.MapReverseProxy();

app.Run();
