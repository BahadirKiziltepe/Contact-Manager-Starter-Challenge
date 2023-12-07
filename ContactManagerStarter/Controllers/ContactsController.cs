using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ContactManager.Data;
using ContactManager.Hubs;
using ContactManager.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MailKit;
using MimeKit;
using MailKit.Net.Smtp;
using ContactManagerStarter.Models;

namespace ContactManager.Controllers // Added ILogger and error handling to all methods.
{
    public class ContactsController : Controller
    {
        private readonly ApplicationContext _context;
        private readonly IHubContext<ContactHub> _hubContext;
        private readonly ILogger<ContactsController> _logger;

        public ContactsController(ApplicationContext context, IHubContext<ContactHub> hubContext, ILogger<ContactsController> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task<IActionResult> DeleteContact(Guid id)
        {
            var contactToDelete = await _context.Contacts
                .Include(x => x.EmailAddresses)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (contactToDelete == null)
            {
                _logger.LogWarning("DeleteContact: Contact with ID: {ContactId} not found.", id);
                return NotFound();
            }

            try
            {
                _context.EmailAddresses.RemoveRange(contactToDelete.EmailAddresses);
                _context.Contacts.Remove(contactToDelete);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("Update");

                _logger.LogInformation("DeleteContact: Contact with ID: {ContactId} deleted successfully.", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteContact: An unknown error occurred while deleting the contact with ID: {ContactId}.", id);
                return StatusCode(500, "An unknown error occurred.");
            }
        }

        public async Task<IActionResult> EditContact(Guid id)
        {
            var contact = await _context.Contacts
                .Include(x => x.EmailAddresses)
                .Include(x => x.Addresses)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (contact == null)
            {
                _logger.LogWarning("EditContact: Contact with ID: {ContactId} not found.", id);
                return NotFound();
            }

            try
            {
                var viewModel = new EditContactViewModel
                {
                    Id = contact.Id,
                    Title = contact.Title,
                    FirstName = contact.FirstName,
                    LastName = contact.LastName,
                    DOB = contact.DOB,
                    PrimaryEmail = contact.PrimaryEmail,
                    EmailAddresses = contact.EmailAddresses,
                    Addresses = contact.Addresses
                };

                _logger.LogInformation("Contact with ID: {ContactId} found and editing view is being returned.", id);
                return PartialView("_EditContact", viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "EditContact: An unknown error occurred for contact with ID: {ContactId}.", id);
                return StatusCode(500, "An unknown error occurred.");
            }
        }

        public async Task<IActionResult> GetContacts()
        {
            try
            {
                var contactList = await _context.Contacts
                    .OrderBy(x => x.FirstName)
                    .ToListAsync();

                return PartialView("_ContactTable", new ContactViewModel { Contacts = contactList });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetContacts: An unexpected error occurred.");
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult NewContact()
        {
            return PartialView("_EditContact", new EditContactViewModel());
        }

        [HttpPost]
        public async Task<IActionResult> SaveContact([FromBody] SaveContactViewModel model)
        {
            var contact = model.ContactId == Guid.Empty
                ? new Contact { Title = model.Title, FirstName = model.FirstName, LastName = model.LastName, DOB = model.DOB }
                : await _context.Contacts.Include(x => x.EmailAddresses).Include(x => x.Addresses).FirstOrDefaultAsync(x => x.Id == model.ContactId);

            _logger.LogInformation("Attempting to save contact with ID: {ContactId}", model.ContactId);

            if (contact == null)
            {
                _logger.LogWarning("Contact with ID: {ContactId} not found.", model.ContactId);
                return NotFound();
            }

            try
            {
                _context.EmailAddresses.RemoveRange(contact.EmailAddresses);
                _context.Addresses.RemoveRange(contact.Addresses);

                // Sets the first email as primary email as default.
                for (int i = 0; i < model.Emails.Count; i++)
                {
                    EmailAddress address = new EmailAddress
                    {
                        Type = model.Emails[i].Type,
                        Email = model.Emails[i].Email,
                        Contact = contact
                    };
                    contact.EmailAddresses.Add(address);
                    _logger.LogInformation("{Address} email address is added to contact with ID: {ContactId}", address, model.ContactId);

                    if (i == 0 && String.IsNullOrEmpty(contact.PrimaryEmail))
                    {
                        contact.PrimaryEmail = address.Email;
                        _logger.LogInformation("{PrimaryEmail} is set as primary email for contact with ID: {ContactId}", contact.PrimaryEmail, model.ContactId);
                    }
                }

                if (String.IsNullOrEmpty(contact.PrimaryEmail))
                {
                    contact.PrimaryEmail = "";
                    _logger.LogInformation("No primary email is set for contact with ID: {ContactId}", model.ContactId);
                }

                foreach (var address in model.Addresses)
                {
                    Address newAddress = new Address
                    {
                        Street1 = address.Street1,
                        Street2 = address.Street2,
                        City = address.City,
                        State = address.State,
                        Zip = address.Zip,
                        Type = address.Type
                    };

                    contact.Addresses.Add(newAddress);
                    _logger.LogInformation("{Address} added to contact with ID: {ContactId}", newAddress, model.ContactId);
                }

                contact.Title = model.Title;
                contact.FirstName = model.FirstName;
                contact.LastName = model.LastName;
                contact.DOB = model.DOB;


                if (model.ContactId == Guid.Empty)
                {
                    await _context.Contacts.AddAsync(contact);
                }
                else
                {
                    _context.Contacts.Update(contact);
                }


                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("Update");

                SendEmailNotification(contact.Id);

                _logger.LogInformation("Contact is set with ID: {ContactId}", model.ContactId);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SaveContact: An unexpected error occurred.");
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        // This method was added to update the primary email.
        [HttpPost]
        public async Task<IActionResult> UpdatePrimaryEmail([FromBody] UpdatePrimaryEmailModel model)
        {
            var contact = await _context.Contacts.FindAsync(model.ContactId);
            if (contact == null)
            {
                _logger.LogWarning("UpdatePrimaryEmail: Contact with ID {ContactId} not found.", model.ContactId);
                return NotFound();
            }

            try
            {
                contact.PrimaryEmail = model.Email;

                _context.Contacts.Update(contact);
                await _context.SaveChangesAsync();

                _logger.LogInformation("UpdatePrimaryEmail: Updated primary email for contact ID {ContactId}.", model.ContactId);
                await _hubContext.Clients.All.SendAsync("Update");

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdatePrimaryEmail: An unexpected error occurred.");
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        private void SendEmailNotification(Guid contactId)
        {
            try
            {
                var message = new MimeMessage();

                message.From.Add(new MailboxAddress("noreply", "noreply@contactmanager.com"));
                message.To.Add(new MailboxAddress("SysAdmin", "Admin@contactmanager.com"));
                message.Subject = "ContactManager System Alert";

                message.Body = new TextPart("plain")
                {
                    Text = "Contact with id:" + contactId.ToString() + " was updated"
                };

                using (var client = new SmtpClient())
                {
                    // For demo-purposes, accept all SSL certificates (in case the server supports STARTTLS)
                    client.ServerCertificateValidationCallback = (s, c, h, e) => true;

                    client.Connect("127.0.0.1", 25, false);

                    client.Send(message);
                    client.Disconnect(true);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendEmailNotification: An error occurred while sending email notification for contact ID {ContactId}.", contactId);
                // Exception would be handled here!
            }
        }

    }

}