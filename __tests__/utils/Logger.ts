class Logger {
  public info(...args): void {
    console.log(...args);
  }

  public error(...args): void {
    console.error(...args);
  }

  public debug(...args): void {
    console.debug(...args);
  }
}

export { Logger };
