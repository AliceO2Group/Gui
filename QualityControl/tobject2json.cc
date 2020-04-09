#include <napi.h>
#include <QualityControl/DatabaseFactory.h>
#include <TROOT.h>
#include <iostream>

using namespace o2::quality_control::core;
using namespace o2::quality_control::repository;
static std::unique_ptr<DatabaseInterface> BackendInstance;

class TObjectAsyncWorker : public Napi::AsyncWorker
{
public:
  TObjectAsyncWorker(const Napi::Function& callback, const std::string& path, const long timestamp)
  : Napi::AsyncWorker(callback), path(path), output(), timestamp(timestamp)
  {
    ROOT::EnableThreadSafety();
  }

protected:
  void Execute() override
  {
    const auto slashIndex = path.find_first_of('/');
    output = BackendInstance->retrieveMOJson(path.substr(0, slashIndex), path.substr(slashIndex + 1), timestamp);
  }

  void OnOK() override
  {
    Napi::Env env = Env();

    Callback().MakeCallback(
      Receiver().Value(),
      {
        env.Null(),
        Napi::String::New(env, output)
      }
    );
  }

  void OnError(const Napi::Error& e) override
  {
    Napi::Env env = Env();

    Callback().MakeCallback(
      Receiver().Value(),
      {
        e.Value(),
        env.Undefined()
      }
    );
  }

private:
  std::string path;
  std::string output;
  long timestamp;
};


/// Create backend instance
void InitBackend(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if ((info.Length() < 5) && (!info[0].IsString())) {
    Napi::TypeError::New(env, "Invalid argument").ThrowAsJavaScriptException();
  }

  if (!BackendInstance) {
    std::string type = info[0].As<Napi::String>();
    std::string host = info[1].As<Napi::String>();
    std::string database = info[2].As<Napi::String>();
    std::string username = info[3].As<Napi::String>();
    std::string password = info[4].As<Napi::String>();
    BackendInstance = DatabaseFactory::create(type);
    BackendInstance->connect(host, database, username, password);
  }
}

/// Get JSON-encoded TObject asynchronously
void GetObject(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Invalid argument count").ThrowAsJavaScriptException();
    return;
  }

  if (!info[2].IsFunction()) {
    Napi::TypeError::New(env, "Invalid argument types").ThrowAsJavaScriptException();
    return;
  }

  Napi::Function cb = info[2].As<Napi::Function>();
  std::string path = info[0].As<Napi::String>();
  long timestamp = info[1].As<Napi::Number>().Int32Value();

  (new TObjectAsyncWorker(cb, path, timestamp))->Queue();

  return;
}

/// Define methods
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(
    Napi::String::New(env, "get"),
    Napi::Function::New(env, GetObject)
  );
  exports.Set(
    Napi::String::New(env, "init"),
    Napi::Function::New(env, InitBackend)
  );
  return exports;
}


NODE_API_MODULE(tobject2json, Init)
