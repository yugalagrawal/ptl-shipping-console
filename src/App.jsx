import { Routes, Route } from 'react-router-dom'
import ProtectedLayout from './components/ProtectedLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Onboarding from './pages/client/Onboarding.jsx'
import NewClient from './pages/client/NewClient.jsx'
import ClientApprovals from './pages/client/ClientApprovals.jsx'
import ActiveClients from './pages/client/ActiveClients.jsx'
import ClientDetail from './pages/client/ClientDetail.jsx'
import ClientPricingConfiguration from './pages/client/ClientPricingConfiguration.jsx'
import ClientConfiguration from './pages/client/ClientConfiguration.jsx'
import ClientEmailLogs from './pages/client/ClientEmailLogs.jsx'
import ClientProspects from './pages/client/ClientProspects.jsx'
import PartnerOnboarding from './pages/partner/PartnerOnboarding.jsx'
import NewPartner from './pages/partner/NewPartner.jsx'
import PartnerApprovals from './pages/partner/PartnerApprovals.jsx'
import MyPartners from './pages/partner/MyPartners.jsx'
import PartnerConfiguration from './pages/partner/PartnerConfiguration.jsx'
import PartnerProspects from './pages/partner/PartnerProspects.jsx'
import PartnerEmailLogs from './pages/partner/PartnerEmailLogs.jsx'
import CreatePickup from './pages/order/CreatePickup.jsx'
import MyOrders from './pages/order/MyOrders.jsx'
import PRS from './pages/order/PRS.jsx'
import CreateDocket from './pages/docket/CreateDocket.jsx'
import EwayBill from './pages/docket/EwayBill.jsx'
import DocketDashboard from './pages/docket/DocketDashboard.jsx'
import GeographyMaster from './pages/master/GeographyMaster.jsx'
import LogisticsMaster from './pages/master/LogisticsMaster.jsx'
import MappingLadder from './pages/master/MappingLadder.jsx'
import ConsignorConsigneeMasters from './pages/master/ConsignorConsigneeMasters.jsx'
import RoutingSimulator from './pages/trip/RoutingSimulator.jsx'
import Tracking from './pages/trip/Tracking.jsx'
import PastTrips from './pages/trip/PastTrips.jsx'
import TripAnalytics from './pages/trip/Analytics.jsx'
import FleetRoster from './pages/supply-fleet/FleetRoster.jsx'
import TruckAssignment from './pages/supply-fleet/TruckAssignment.jsx'
import WarehouseHubOps from './pages/WarehouseHubOps.jsx'
import RouteCostSimulator from './pages/network/RouteCostSimulator.jsx'
import FreightCalculator from './pages/network/FreightCalculator.jsx'
import Mis from './pages/finance/Mis.jsx'
import Invoicing from './pages/finance/Invoicing.jsx'
import Collections from './pages/finance/Collections.jsx'
import FinanceAnalytics from './pages/finance/Analytics.jsx'
import LogicEngine from './pages/LogicEngine.jsx'
import AccessManagement from './pages/admin/AccessManagement.jsx'
import UserRelations from './pages/admin/UserRelations.jsx'
import MyProfile from './pages/admin/MyProfile.jsx'
import SystemInfo from './pages/SystemInfo.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/client-module/onboarding" element={<Onboarding />} />
        <Route path="/client-module/onboarding/new" element={<NewClient />} />
        <Route path="/client-module/approvals" element={<ClientApprovals />} />
        <Route path="/client-module/active-clients" element={<ActiveClients />} />
        <Route path="/client-module/active-clients/:clientId" element={<ClientDetail />} />
        <Route path="/client-module/pricing-configuration" element={<ClientPricingConfiguration />} />
        <Route path="/client-module/client-configuration" element={<ClientConfiguration />} />
        <Route path="/client-module/email-logs" element={<ClientEmailLogs />} />
        <Route path="/client-module/prospects" element={<ClientProspects />} />
        <Route path="/partner-module/onboarding" element={<PartnerOnboarding />} />
        <Route path="/partner-module/onboarding/new" element={<NewPartner />} />
        <Route path="/partner-module/approvals" element={<PartnerApprovals />} />
        <Route path="/partner-module/my-partners" element={<MyPartners />} />
        <Route path="/partner-module/configuration" element={<PartnerConfiguration />} />
        <Route path="/partner-module/prospects" element={<PartnerProspects />} />
        <Route path="/partner-module/email-logs" element={<PartnerEmailLogs />} />
        <Route path="/order-module/create-order" element={<CreatePickup />} />
        <Route path="/order-module/my-orders" element={<MyOrders />} />
        <Route path="/order-module/prs" element={<PRS />} />
        <Route path="/docket-module/create-docket" element={<CreateDocket />} />
        <Route path="/docket-module/eway-bill" element={<EwayBill />} />
        <Route path="/docket-module/dashboard" element={<DocketDashboard />} />
        <Route path="/master-module/geography-master" element={<GeographyMaster />} />
        <Route path="/master-module/logistics-master" element={<LogisticsMaster />} />
        <Route path="/master-module/mapping-ladder" element={<MappingLadder />} />
        <Route path="/master-module/consignor-consignee-masters" element={<ConsignorConsigneeMasters />} />
        <Route path="/trip-management/routing-simulator" element={<RoutingSimulator />} />
        <Route path="/trip-management/tracking" element={<Tracking />} />
        <Route path="/trip-management/past-trips" element={<PastTrips />} />
        <Route path="/trip-management/analytics" element={<TripAnalytics />} />
        <Route path="/supply-fleet-module/fleet-roster" element={<FleetRoster />} />
        <Route path="/supply-fleet-module/truck-assignment" element={<TruckAssignment />} />
        <Route path="/warehouse-hub-ops" element={<WarehouseHubOps />} />
        <Route path="/network-simulator/route-cost" element={<RouteCostSimulator />} />
        <Route path="/network-simulator/freight-calculator" element={<FreightCalculator />} />
        <Route path="/finance-management/mis" element={<Mis />} />
        <Route path="/finance-management/invoicing" element={<Invoicing />} />
        <Route path="/finance-management/collections" element={<Collections />} />
        <Route path="/finance-management/analytics" element={<FinanceAnalytics />} />
        <Route path="/logic-engine" element={<LogicEngine />} />
        <Route path="/user-module/access-management" element={<AccessManagement />} />
        <Route path="/user-module/user-relations" element={<UserRelations />} />
        <Route path="/user-module/my-profile" element={<MyProfile />} />
        <Route path="/system-info" element={<SystemInfo />} />
      </Route>
    </Routes>
  )
}
