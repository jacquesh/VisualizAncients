//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------
#pragma warning disable 1591

// Generated from: steammessages_secrets.steamclient.proto
// Note: requires additional types generated from: steammessages_unified_base.steamclient.proto
namespace SteamKit2.Unified.Internal
{
  [global::System.Serializable, global::ProtoBuf.ProtoContract(Name=@"CKeyEscrow_Request")]
  public partial class CKeyEscrow_Request : global::ProtoBuf.IExtensible
  {
    public CKeyEscrow_Request() {}
    

    private byte[] _rsa_oaep_sha_ticket = null;
    [global::ProtoBuf.ProtoMember(1, IsRequired = false, Name=@"rsa_oaep_sha_ticket", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue(null)]
    public byte[] rsa_oaep_sha_ticket
    {
      get { return _rsa_oaep_sha_ticket; }
      set { _rsa_oaep_sha_ticket = value; }
    }

    private byte[] _password = null;
    [global::ProtoBuf.ProtoMember(2, IsRequired = false, Name=@"password", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue(null)]
    public byte[] password
    {
      get { return _password; }
      set { _password = value; }
    }

    private EKeyEscrowUsage _usage = EKeyEscrowUsage.k_EKeyEscrowUsageStreamingDevice;
    [global::ProtoBuf.ProtoMember(3, IsRequired = false, Name=@"usage", DataFormat = global::ProtoBuf.DataFormat.TwosComplement)]
    [global::System.ComponentModel.DefaultValue(EKeyEscrowUsage.k_EKeyEscrowUsageStreamingDevice)]
    public EKeyEscrowUsage usage
    {
      get { return _usage; }
      set { _usage = value; }
    }

    private string _device_name = "";
    [global::ProtoBuf.ProtoMember(4, IsRequired = false, Name=@"device_name", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue("")]
    public string device_name
    {
      get { return _device_name; }
      set { _device_name = value; }
    }
    private global::ProtoBuf.IExtension extensionObject;
    global::ProtoBuf.IExtension global::ProtoBuf.IExtensible.GetExtensionObject(bool createIfMissing)
      { return global::ProtoBuf.Extensible.GetExtensionObject(ref extensionObject, createIfMissing); }
  }
  
  [global::System.Serializable, global::ProtoBuf.ProtoContract(Name=@"CKeyEscrow_Ticket")]
  public partial class CKeyEscrow_Ticket : global::ProtoBuf.IExtensible
  {
    public CKeyEscrow_Ticket() {}
    

    private byte[] _password = null;
    [global::ProtoBuf.ProtoMember(1, IsRequired = false, Name=@"password", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue(null)]
    public byte[] password
    {
      get { return _password; }
      set { _password = value; }
    }

    private ulong _identifier = default(ulong);
    [global::ProtoBuf.ProtoMember(2, IsRequired = false, Name=@"identifier", DataFormat = global::ProtoBuf.DataFormat.TwosComplement)]
    [global::System.ComponentModel.DefaultValue(default(ulong))]
    public ulong identifier
    {
      get { return _identifier; }
      set { _identifier = value; }
    }

    private byte[] _payload = null;
    [global::ProtoBuf.ProtoMember(3, IsRequired = false, Name=@"payload", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue(null)]
    public byte[] payload
    {
      get { return _payload; }
      set { _payload = value; }
    }

    private uint _timestamp = default(uint);
    [global::ProtoBuf.ProtoMember(4, IsRequired = false, Name=@"timestamp", DataFormat = global::ProtoBuf.DataFormat.TwosComplement)]
    [global::System.ComponentModel.DefaultValue(default(uint))]
    public uint timestamp
    {
      get { return _timestamp; }
      set { _timestamp = value; }
    }

    private EKeyEscrowUsage _usage = EKeyEscrowUsage.k_EKeyEscrowUsageStreamingDevice;
    [global::ProtoBuf.ProtoMember(5, IsRequired = false, Name=@"usage", DataFormat = global::ProtoBuf.DataFormat.TwosComplement)]
    [global::System.ComponentModel.DefaultValue(EKeyEscrowUsage.k_EKeyEscrowUsageStreamingDevice)]
    public EKeyEscrowUsage usage
    {
      get { return _usage; }
      set { _usage = value; }
    }

    private string _device_name = "";
    [global::ProtoBuf.ProtoMember(6, IsRequired = false, Name=@"device_name", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue("")]
    public string device_name
    {
      get { return _device_name; }
      set { _device_name = value; }
    }

    private string _device_model = "";
    [global::ProtoBuf.ProtoMember(7, IsRequired = false, Name=@"device_model", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue("")]
    public string device_model
    {
      get { return _device_model; }
      set { _device_model = value; }
    }

    private string _device_serial = "";
    [global::ProtoBuf.ProtoMember(8, IsRequired = false, Name=@"device_serial", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue("")]
    public string device_serial
    {
      get { return _device_serial; }
      set { _device_serial = value; }
    }

    private uint _device_provisioning_id = default(uint);
    [global::ProtoBuf.ProtoMember(9, IsRequired = false, Name=@"device_provisioning_id", DataFormat = global::ProtoBuf.DataFormat.TwosComplement)]
    [global::System.ComponentModel.DefaultValue(default(uint))]
    public uint device_provisioning_id
    {
      get { return _device_provisioning_id; }
      set { _device_provisioning_id = value; }
    }
    private global::ProtoBuf.IExtension extensionObject;
    global::ProtoBuf.IExtension global::ProtoBuf.IExtensible.GetExtensionObject(bool createIfMissing)
      { return global::ProtoBuf.Extensible.GetExtensionObject(ref extensionObject, createIfMissing); }
  }
  
  [global::System.Serializable, global::ProtoBuf.ProtoContract(Name=@"CKeyEscrow_Response")]
  public partial class CKeyEscrow_Response : global::ProtoBuf.IExtensible
  {
    public CKeyEscrow_Response() {}
    

    private CKeyEscrow_Ticket _ticket = null;
    [global::ProtoBuf.ProtoMember(1, IsRequired = false, Name=@"ticket", DataFormat = global::ProtoBuf.DataFormat.Default)]
    [global::System.ComponentModel.DefaultValue(null)]
    public CKeyEscrow_Ticket ticket
    {
      get { return _ticket; }
      set { _ticket = value; }
    }
    private global::ProtoBuf.IExtension extensionObject;
    global::ProtoBuf.IExtension global::ProtoBuf.IExtensible.GetExtensionObject(bool createIfMissing)
      { return global::ProtoBuf.Extensible.GetExtensionObject(ref extensionObject, createIfMissing); }
  }
  
    [global::ProtoBuf.ProtoContract(Name=@"EKeyEscrowUsage", EnumPassthru=true)]
    public enum EKeyEscrowUsage
    {
            
      [global::ProtoBuf.ProtoEnum(Name=@"k_EKeyEscrowUsageStreamingDevice", Value=0)]
      k_EKeyEscrowUsageStreamingDevice = 0
    }
  
    public interface ISecrets
    {
      CKeyEscrow_Response KeyEscrow(CKeyEscrow_Request request);
    
    }
    
    
}
#pragma warning restore 1591
