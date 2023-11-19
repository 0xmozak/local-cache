export var Inputs;
(function (Inputs) {
    Inputs["Key"] = "key";
    Inputs["Path"] = "path";
    Inputs["RestoreKeys"] = "restore-keys";
    Inputs["FailOnCacheMiss"] = "fail-on-cache-miss";
    Inputs["LookupOnly"] = "lookup-only"; // Input for cache, restore action
})(Inputs || (Inputs = {}));
export var Outputs;
(function (Outputs) {
    Outputs["CacheHit"] = "cache-hit";
    Outputs["CachePrimaryKey"] = "cache-primary-key";
    Outputs["CacheMatchedKey"] = "cache-matched-key"; // Output from restore action
})(Outputs || (Outputs = {}));
export var State;
(function (State) {
    State["CachePrimaryKey"] = "CACHE_KEY";
    State["CacheMatchedKey"] = "CACHE_RESULT";
})(State || (State = {}));
