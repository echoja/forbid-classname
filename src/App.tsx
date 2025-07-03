import "./App.css";

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function App() {
  console.log(/* className */ "do-not-use-this forbidden-class another");

  cn(
    "do-not-use-this another",
    "another-class",
    undefined,
    "yet-another-class",
    "forbidden-class another"
  );

  return (
    <div>
      <div className="do-not-use-this">abc</div>
      <div className="forbidden-class">def</div>
      <div className={cn("sm:forbidden-class", "yet-another-class")}>ghi</div>
    </div>
  );
}

export default App;
