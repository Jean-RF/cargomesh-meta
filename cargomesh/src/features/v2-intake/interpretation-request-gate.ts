/** One current text request per assistant; draft identity never leaves this gate. */
export class InterpretationRequestGate {
  private active: { identity: string; controller: AbortController } | null = null;
  start(identity: string) {
    this.cancel();
    const ticket = { identity, controller: new AbortController() };
    this.active = ticket;
    return { signal: ticket.controller.signal, finish: () => { if (this.active === ticket) this.active = null; } };
  }
  invalidate(identity: string) { if (this.active && this.active.identity !== identity) this.cancel(); }
  cancel() { this.active?.controller.abort(); this.active = null; }
}
