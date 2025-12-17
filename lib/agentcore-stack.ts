import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AgentCoreGateway } from "./constructs/agentcore-gateway";

export interface AgentCoreStackProps extends cdk.StackProps {
  /**
   * Gateway の名前 (オプション)
   * デフォルト: 'default-gateway'
   */
  readonly gatewayName?: string;

  /**
   * Gateway の説明 (オプション)
   */
  readonly gatewayDescription?: string;

  /**
   * 認証タイプ (オプション)
   * デフォルト: cognito
   */
  readonly authType?: "cognito" | "iam" | "jwt";

  /**
   * JWTの設定 (authType が 'jwt' の場合に必要)
   */
  readonly jwtConfig?: {
    readonly discoveryUrl: string;
    readonly allowedAudience?: string[];
    readonly allowedClients?: string[];
  };
}

/**
 * Amazon Bedrock AgentCore Stack
 *
 * AgentCore Gateway とその他の関連リソースをデプロイするためのCDKスタック
 */
export class AgentCoreStack extends cdk.Stack {
  /**
   * 作成された AgentCore Gateway
   */
  public readonly gateway: AgentCoreGateway;

  constructor(scope: Construct, id: string, props?: AgentCoreStackProps) {
    super(scope, id, props);

    // Gateway名の設定
    const gatewayName = props?.gatewayName || "default-gateway";

    // AgentCore Gateway の作成
    this.gateway = new AgentCoreGateway(this, "AgentCoreGateway", {
      gatewayName: gatewayName,
      description:
        props?.gatewayDescription || `AgentCore Gateway - ${gatewayName}`,
      authType: props?.authType || "cognito",
      jwtConfig: props?.jwtConfig,
      mcpConfig: {
        instructions:
          "このGatewayを使用してAgentCoreツールと外部サービス間の統合を行います",
      },
    });

    // CloudFormation出力
    new cdk.CfnOutput(this, "GatewayArn", {
      value: this.gateway.gatewayArn,
      description: "AgentCore Gateway ARN",
      exportName: `${id}-GatewayArn`,
    });

    new cdk.CfnOutput(this, "GatewayId", {
      value: this.gateway.gatewayId,
      description: "AgentCore Gateway ID",
      exportName: `${id}-GatewayId`,
    });

    // タグの追加
    cdk.Tags.of(this).add("Project", "AgentCore");
    cdk.Tags.of(this).add("Component", "Gateway");
  }

  /**
   * 簡単なLambda関数をGatewayTargetとして追加するヘルパーメソッド
   */
  public addSimpleLambdaTarget(targetName: string, code: string): void {
    // 注意: 実際の実装では適切なLambda関数を作成する必要があります
    // ここではプレースホルダーとして記述
    // const lambdaFunction = new lambda.Function(this, `${targetName}Lambda`, {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromInline(code),
    // });
    // this.gateway.addLambdaTarget(targetName, lambdaFunction);
  }
}
