using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProjectManagementService.Data;
using ProjectManagementService.Models;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace ProjectManagementService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClientController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly ILogger<ClientController> _logger;  // Add logger field

        public ClientController(ProjectManagementDbContext context, ILogger<ClientController> logger)
        {
            _context = context;
            _logger = logger;  // Initialize logger
        }

        // Get all clients
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Client>>> GetClients()
        {
            _logger.LogInformation("Getting all clients.");
            var clients = await _context.Clients.ToListAsync();
            return clients;
        }

        // Get client by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<Client>> GetClient(string id)
        {
            _logger.LogInformation($"Getting client with ID: {id}");
            var client = await _context.Clients.FindAsync(id);
            if (client == null)
            {
                _logger.LogWarning($"Client with ID: {id} not found.");
                return NotFound();
            }
            return client;
        }

        [HttpPost("create")]
        public async Task<ActionResult<Client>> CreateClient([FromBody] Client client)
        {
            if (!Enum.IsDefined(typeof(ClientType), client.Type))
            {
                return BadRequest("Invalid client type.");
            }

            client.Id = Guid.NewGuid().ToString();
            client.CreatedAt = DateTime.UtcNow;
            client.UpdatedAt = DateTime.UtcNow;

            Console.WriteLine("Final client object before saving: " + JsonSerializer.Serialize(client));

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClient), new { id = client.Id }, client);
        }

        // Update an existing client
        [HttpPut("update/{id}")]
        public async Task<IActionResult> UpdateClient(string id, [FromBody] Client client)
        {
            var existingClient = await _context.Clients.FindAsync(id);

            if (existingClient == null)
            {
                _logger.LogWarning($"Client with ID: {id} not found for update.");
                return NotFound();
            }

            // Update fields
            existingClient.Name = client.Name;
            existingClient.Type = client.Type;
            existingClient.Email = client.Email;
            existingClient.Phone = client.Phone;
            existingClient.Address = client.Address;
            existingClient.Website = client.Website;
            existingClient.Industry = client.Industry;
            existingClient.ContactPerson = client.ContactPerson;
            existingClient.ContactEmail = client.ContactEmail;
            existingClient.ContactPhone = client.ContactPhone;
            existingClient.Logo = client.Logo;
            existingClient.Notes = client.Notes;
            existingClient.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                _logger.LogError($"Concurrency exception when updating client with ID: {id}");
                throw;
            }

            _logger.LogInformation($"Client with ID: {id} updated successfully.");
            return NoContent();
        }

        // Delete a client
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteClient(string id)
        {
            var client = await _context.Clients.FindAsync(id);
            if (client == null)
            {
                _logger.LogWarning($"Client with ID: {id} not found for deletion.");
                return NotFound();
            }

            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Client with ID: {id} deleted successfully.");
            return NoContent();
        }

        private bool ClientExists(string id)
        {
            return _context.Clients.Any(e => e.Id == id);
        }
    }
}
