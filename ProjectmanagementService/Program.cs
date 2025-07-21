using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using ProjectManagementService.Data;
using Microsoft.Extensions.Logging;
using ProjectmanagementService.Services;
using ProjectManagementService.Services;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext with PostgreSQL using the connection string from appsettings.json  
builder.Services.AddDbContext<ProjectManagementDbContext>(options =>
   options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure logging using the settings from appsettings.json  
builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.AddConfiguration(builder.Configuration.GetSection("Logging"));
    loggingBuilder.AddConsole(); // Adds console logging  
});

// Add necessary services  
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<DeliverableService>();
builder.Services.AddScoped<ActivityLogger>();
builder.Services.AddSingleton<KafkaProducerService>();
builder.Services.AddScoped<GroqService>();
builder.Services.AddScoped<ExcelService>();
builder.Services.AddHttpClient<IGroqChatService, GroqChatService>();

var app = builder.Build();

// Configure Swagger UI for Development environment  
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Apply migrations on startup  
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ProjectManagementDbContext>();
    db.Database.Migrate();
}

// Run the application  
app.Run();
