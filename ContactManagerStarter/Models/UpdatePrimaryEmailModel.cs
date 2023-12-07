namespace ContactManagerStarter.Models
{
    public class UpdatePrimaryEmailModel // Added to serve as a DTO.
    {
        public Guid ContactId { get; set; }
        public string Email { get; set; }
    }
}