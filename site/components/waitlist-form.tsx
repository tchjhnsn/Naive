export function WaitlistForm() {
  return (
    <form className="waitlist-form" action="/waitlist/enroll" method="post">
      <label htmlFor="waitlist-email">Email</label>
      <input id="waitlist-email" name="email" type="email" autoComplete="email" required maxLength={254} />
      <label className="waitlist-consent">
        <input name="interest" type="checkbox" value="yes" required />
        <span>Record my interest in early access. This does not create an account and does not send email.</span>
      </label>
      <button className="naive-move" type="submit">Join the waitlist</button>
    </form>
  );
}
