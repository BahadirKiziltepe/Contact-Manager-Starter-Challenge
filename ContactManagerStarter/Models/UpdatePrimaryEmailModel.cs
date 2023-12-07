namespace ContactManagerStarter.Models
{
    public class UpdatePrimaryEmailModel
    {
        public Guid ContactId { get; set; }
        public string Email { get; set; }
    }
}