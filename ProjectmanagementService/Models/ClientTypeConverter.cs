using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProjectManagementService.Models;

public class ClientTypeConverter : JsonConverter<ClientType>
{
    public override ClientType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // Read the string value and parse it into an enum
        var value = reader.GetString();
        if (Enum.TryParse<ClientType>(value, true, out var result))
        {
            return result;
        }
        throw new JsonException($"Invalid value for ClientType: {value}");
    }

    public override void Write(Utf8JsonWriter writer, ClientType value, JsonSerializerOptions options)
    {
        // Write the enum as a string
        writer.WriteStringValue(value.ToString());
    }
}
