﻿using System;
using System.Threading;
using System.Reflection;
using System.Collections.Generic;

using SteamKit2;
using SteamKit2.Internal; // For the protobuf message type
using SteamKit2.GC;
using SteamKit2.GC.Internal;
using SteamKit2.GC.Dota;
using SteamKit2.GC.Dota.Internal;

namespace demodownloader
{
    class Dota2Client
    {
        const int DOTA_APP_ID = 570;

        private SteamClient steam;
        private CallbackManager manager;
        private SteamGameCoordinator gameCoordinator;

        private SteamUser user;
        private string userName;
        private string userPassword;

        public Dota2Client(string accountName, string accountPassword)
        {
            steam = new SteamClient();
            user = steam.GetHandler<SteamUser>();
            manager = new CallbackManager(steam);
            gameCoordinator = steam.GetHandler<SteamGameCoordinator>();

            manager.Subscribe<SteamClient.ConnectedCallback>(onConnect);
            manager.Subscribe<SteamUser.LoggedOnCallback>(onLogon);
            manager.Subscribe<SteamGameCoordinator.MessageCallback>(onMessage);

            userName = accountName;
            userPassword = accountPassword;
        }

        public void Connect()
        {
            Console.WriteLine("Connecting...");
            SteamDirectory.Initialize().Wait();
            steam.Connect();

            while(true)
            {
                manager.RunWaitCallbacks(TimeSpan.FromSeconds(1));
            }
        }

        private void onConnect(SteamClient.ConnectedCallback callback)
        {
            if (callback.Result != EResult.OK)
            {
                Console.WriteLine("ERROR: Unable to connect to steam: {0}", callback.Result);
                // TODO: Handle this properly
                return;
            }

            Console.WriteLine("Connected");
            SteamUser.LogOnDetails userDetails = new SteamUser.LogOnDetails();
            userDetails.Username = userName;
            userDetails.Password = userPassword;
            user.LogOn(userDetails);
        }

        private void onLogon(SteamUser.LoggedOnCallback callback)
        {
            if (callback.Result != EResult.OK)
            {
                Console.WriteLine("ERROR: Unable to log in as {0}: {1}", userName, callback.Result);
                // TODO: Handle this properly
                return;
            }

            Console.WriteLine("Logged on");
            CMsgClientGamesPlayed.GamePlayed playingDota2 = new CMsgClientGamesPlayed.GamePlayed();
            playingDota2.game_id = new GameID(DOTA_APP_ID);
            ClientMsgProtobuf<CMsgClientGamesPlayed> playMsg = new ClientMsgProtobuf<CMsgClientGamesPlayed>(EMsg.ClientGamesPlayed);
            playMsg.Body.games_played.Add(playingDota2);
            steam.Send(playMsg);

            Thread.Sleep(5000); // TODO: Can we not wait for something a bit more reliable? Like a callback or something?

            ClientGCMsgProtobuf<CMsgClientHello> someMsg = new ClientGCMsgProtobuf<CMsgClientHello>((uint)EGCBaseClientMsg.k_EMsgGCClientHello);
            someMsg.Body.engine = ESourceEngine.k_ESE_Source2;
            gameCoordinator.Send(someMsg, DOTA_APP_ID);
        }

        private void onMessage(SteamGameCoordinator.MessageCallback callback)
        {
            Console.WriteLine("Received message: {0}", callback.EMsg);

            Dictionary<uint, Action<IPacketGCMsg>> msgMap = new Dictionary<uint, Action<IPacketGCMsg>>();
            msgMap[(uint)EGCBaseClientMsg.k_EMsgGCClientWelcome] = onWelcomeReceived;
            msgMap[(uint)EDOTAGCMsg.k_EMsgGCMatchDetailsResponse] = onMatchDetailsReceived;

            if (msgMap.ContainsKey(callback.EMsg))
            {
                msgMap[callback.EMsg](callback.Message);
            }
        }

        private void onWelcomeReceived(IPacketGCMsg msg)
        {
            ClientGCMsgProtobuf<CMsgGCMatchDetailsRequest> request = new ClientGCMsgProtobuf<CMsgGCMatchDetailsRequest>((uint)EDOTAGCMsg.k_EMsgGCMatchDetailsRequest);
            request.Body.match_id = 2217354801;
            gameCoordinator.Send(request, DOTA_APP_ID);
        }

        private void onMatchDetailsReceived(IPacketGCMsg msg)
        {
            ClientGCMsgProtobuf<CMsgGCMatchDetailsResponse> response = new ClientGCMsgProtobuf<CMsgGCMatchDetailsResponse>(msg);
            if ((EResult)response.Body.result != EResult.OK)
            {
                Console.WriteLine("Unable to request match details: {0}", response.Body.result);
                return;
            }

            CMsgDOTAMatch match = response.Body.match;
            //Lazy reflection, copied from SteamKit dota example:
            var fields = typeof(CMsgDOTAMatch).GetProperties(BindingFlags.Public | BindingFlags.Instance);
            foreach (var field in fields)
            {
                var value = field.GetValue(match, null);

                Console.WriteLine("{0}: {1}", field.Name, value);
            }

            if (match.replay_state != CMsgDOTAMatch.ReplayState.REPLAY_AVAILABLE)
            {
                Console.WriteLine("Replay unable, cannot download");
                return;
            }

            uint replayCluster = match.cluster;
            ulong matchID = match.match_id;
            uint replaySalt = match.replay_salt;
            string replayURL = String.Format("http://replay{0}.valve.net/{1}/{2}_{3}.dem.bz2", replayCluster, DOTA_APP_ID, matchID, replaySalt);
            Console.WriteLine("Replay is available @ {0}", replayURL);

            steam.Disconnect();
        }
    }
}
