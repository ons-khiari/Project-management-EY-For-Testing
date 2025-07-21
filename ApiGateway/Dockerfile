# Use .NET SDK for build & watch (dev mode)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy all files and build
COPY . ./

# Install dotnet-watch tool globally for hot reload
RUN dotnet tool install --global dotnet-watch

# Add dotnet tools to PATH
ENV PATH="$PATH:/root/.dotnet/tools"

# Expose the port your API Gateway listens on
EXPOSE 5185

# Start the app with hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:5185"]
